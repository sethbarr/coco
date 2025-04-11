# Coco Counseling Platform - AWS Deployment Guide

This guide outlines how to deploy the Coco Counseling platform to AWS infrastructure for production use.

## Architecture Overview

The production architecture uses the following AWS services:

- **Amazon ECS (Elastic Container Service)** for container orchestration
- **Amazon RDS** for PostgreSQL database
- **Amazon S3** for static assets
- **Amazon CloudFront** for content delivery
- **Application Load Balancer** for traffic distribution
- **AWS Certificate Manager** for SSL certificates
- **AWS Secrets Manager** for secure credentials storage

## Prerequisites

Before deploying, ensure you have:

1. AWS CLI installed and configured
2. Docker installed
3. Your Anthropic API key
4. A domain name (optional but recommended)

## Step 1: Set Up the Database

1. **Create a PostgreSQL RDS instance**:

```bash
aws rds create-db-instance \
    --db-instance-identifier coco-production-db \
    --db-instance-class db.t3.small \
    --engine postgres \
    --master-username cocodbadmin \
    --master-user-password "SecurePasswordHere" \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxxxxxxx \
    --db-subnet-group-name default \
    --backup-retention-period 7 \
    --multi-az
```

2. **Create a database**:

```bash
# Connect to the RDS instance
psql --host=your-db-instance-endpoint --port=5432 --username=cocodbadmin --password

# Create the database
CREATE DATABASE coco_production;
```

## Step 2: Set Up Secrets

Store sensitive information in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
    --name "coco/production" \
    --description "Coco production environment variables" \
    --secret-string '{
        "DATABASE_URL": "postgresql://cocodbadmin:SecurePasswordHere@your-db-instance-endpoint:5432/coco_production",
        "JWT_SECRET": "your-secure-jwt-secret",
        "ANTHROPIC_API_KEY": "your-anthropic-api-key"
    }'
```

## Step 3: Build and Push Docker Images

1. **Create ECR repositories**:

```bash
aws ecr create-repository --repository-name coco-frontend
aws ecr create-repository --repository-name coco-backend
```

2. **Build and push the frontend image**:

```bash
# Log in to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin your-aws-account-id.dkr.ecr.region.amazonaws.com

# Build the frontend image
cd frontend
docker build -t coco-frontend .

# Tag and push
docker tag coco-frontend:latest your-aws-account-id.dkr.ecr.region.amazonaws.com/coco-frontend:latest
docker push your-aws-account-id.dkr.ecr.region.amazonaws.com/coco-frontend:latest
```

3. **Build and push the backend image**:

```bash
cd ../backend
docker build -t coco-backend .

# Tag and push
docker tag coco-backend:latest your-aws-account-id.dkr.ecr.region.amazonaws.com/coco-backend:latest
docker push your-aws-account-id.dkr.ecr.region.amazonaws.com/coco-backend:latest
```

## Step 4: Create ECS Cluster and Task Definitions

1. **Create an ECS cluster**:

```bash
aws ecs create-cluster --cluster-name coco-production-cluster
```

2. **Create task definitions**:

Create `backend-task.json`:

```json
{
  "family": "coco-backend",
  "networkMode": "awsvpc",
  "executionRoleArn": "arn:aws:iam::your-aws-account-id:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::your-aws-account-id:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "coco-backend",
      "image": "your-aws-account-id.dkr.ecr.region.amazonaws.com/coco-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3001,
          "hostPort": 3001,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/coco-backend",
          "awslogs-region": "region",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:your-aws-account-id:secret:coco/production:DATABASE_URL::"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:your-aws-account-id:secret:coco/production:JWT_SECRET::"
        },
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:your-aws-account-id:secret:coco/production:ANTHROPIC_API_KEY::"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3001"
        },
        {
          "name": "CORS_ORIGIN",
          "value": "https://your-domain.com"
        }
      ],
      "cpu": 256,
      "memory": 512
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512"
}
```

Register the task definition:

```bash
aws ecs register-task-definition --cli-input-json file://backend-task.json
```

Similarly, create and register a frontend task definition.

## Step 5: Set Up Load Balancer and Target Groups

1. **Create target groups**:

```bash
aws elbv2 create-target-group \
    --name coco-backend-tg \
    --protocol HTTP \
    --port 3001 \
    --vpc-id vpc-xxxxxxxx \
    --target-type ip \
    --health-check-path /api/health \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 3 \
    --unhealthy-threshold-count 3
```

2. **Create a load balancer**:

```bash
aws elbv2 create-load-balancer \
    --name coco-alb \
    --subnets subnet-xxxxxxxx subnet-yyyyyyyy \
    --security-groups sg-xxxxxxxx \
    --scheme internet-facing \
    --type application
```

3. **Create a listener**:

```bash
aws elbv2 create-listener \
    --load-balancer-arn alb-arn \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=arn:aws:acm:region:your-aws-account-id:certificate/your-certificate-id \
    --default-actions Type=forward,TargetGroupArn=coco-backend-tg-arn
```

## Step 6: Create ECS Services

1. **Create the backend service**:

```bash
aws ecs create-service \
    --cluster coco-production-cluster \
    --service-name coco-backend-service \
    --task-definition coco-backend:1 \
    --desired-count 2 \
    --launch-type FARGATE \
    --platform-version LATEST \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxx,subnet-yyyyyyyy],securityGroups=[sg-xxxxxxxx],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=coco-backend-tg-arn,containerName=coco-backend,containerPort=3001" \
    --health-check-grace-period-seconds 60 \
    --scheduling-strategy REPLICA \
    --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
    --deployment-controller "type=ECS"
```

2. Create the frontend service in a similar way.

## Step 7: Set Up CloudFront for the Frontend

1. **Create an S3 bucket** for static assets:

```bash
aws s3 mb s3://coco-production-static
```

2. **Create a CloudFront distribution**:

```bash
aws cloudfront create-distribution \
    --origin-domain-name coco-production-static.s3.amazonaws.com \
    --default-root-object index.html \
    --aliases your-domain.com \
    --viewer-certificate "ACMCertificateArn=arn:aws:acm:us-east-1:your-aws-account-id:certificate/your-certificate-id,SSLSupportMethod=sni-only,MinimumProtocolVersion=TLSv1.2_2021"
```

## Step 8: Set Up DNS

Create DNS records pointing to your CloudFront distribution and load balancer:

```bash
aws route53 change-resource-record-sets \
    --hosted-zone-id your-hosted-zone-id \
    --change-batch '{
        "Changes": [
            {
                "Action": "CREATE",
                "ResourceRecordSet": {
                    "Name": "your-domain.com",
                    "Type": "A",
                    "AliasTarget": {
                        "HostedZoneId": "Z2FDTNDATAQYW2",
                        "DNSName": "your-cloudfront-distribution-domain",
                        "EvaluateTargetHealth": false
                    }
                }
            },
            {
                "Action": "CREATE",
                "ResourceRecordSet": {
                    "Name": "api.your-domain.com",
                    "Type": "A",
                    "AliasTarget": {
                        "HostedZoneId": "your-load-balancer-hosted-zone-id",
                        "DNSName": "your-load-balancer-dns-name",
                        "EvaluateTargetHealth": true
                    }
                }
            }
        ]
    }'
```

## Step 9: Set Up Auto Scaling

Configure auto scaling for your ECS services:

```bash
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/coco-production-cluster/coco-backend-service \
    --min-capacity 2 \
    --max-capacity 10

aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/coco-production-cluster/coco-backend-service \
    --policy-name cpu-tracking \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
        "TargetValue": 70.0,
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
        },
        "ScaleOutCooldown": 300,
        "ScaleInCooldown": 300
    }'
```

## Step 10: Set Up Monitoring and Logging

1. **Create CloudWatch alarms**:

```bash
aws cloudwatch put-metric-alarm \
    --alarm-name coco-backend-cpu-high \
    --alarm-description "Alarm when CPU exceeds 85% for 5 minutes" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 85 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ServiceName,Value=coco-backend-service Name=ClusterName,Value=coco-production-cluster \
    --evaluation-periods 1 \
    --alarm-actions arn:aws:sns:region:your-aws-account-id:coco-alerts
```

2. **Set up log groups** for centralized logging:

```bash
aws logs create-log-group --log-group-name /ecs/coco-backend
aws logs create-log-group --log-group-name /ecs/coco-frontend
```

## Step 11: Database Backup Strategy

1. **Configure RDS automated backups**:

```bash
aws rds modify-db-instance \
    --db-instance-identifier coco-production-db \
    --backup-retention-period 14 \
    --preferred-backup-window "00:00-03:00" \
    --apply-immediately
```

2. **Set up cross-region snapshot copying** for disaster recovery:

```bash
aws rds create-db-snapshot \
    --db-snapshot-identifier manual-snapshot-1 \
    --db-instance-identifier coco-production-db

aws rds copy-db-snapshot \
    --source-db-snapshot-identifier arn:aws:rds:us-east-1:your-aws-account-id:snapshot:manual-snapshot-1 \
    --target-db-snapshot-identifier manual-snapshot-1-copy \
    --kms-key-id arn:aws:kms:us-west-2:your-aws-account-id:key/your-kms-key-id \
    --source-region us-east-1 \
    --region us-west-2
```

## Step 12: Set Up CI/CD Pipeline

Use AWS CodePipeline with GitHub Actions integration:

1. Create a `buildspec.yml` file in your repository
2. Set up a CodeBuild project
3. Configure CodePipeline to automatically deploy on main branch changes

## Security Considerations

1. **Network**: Use private subnets for the backend and database
2. **Encryption**: Enable encryption at rest for RDS and S3
3. **IAM**: Follow the principle of least privilege for all roles
4. **WAF**: Consider setting up AWS WAF to protect against common exploits
5. **Secrets**: Rotate secrets regularly using AWS Secrets Manager

## Production Checklist

Before going live:

1. ✅ SSL certificates installed and renewed automatically
2. ✅ Database backups configured and tested
3. ✅ Monitoring and alerting set up
4. ✅ Auto-scaling properly configured
5. ✅ Security groups and network ACLs properly configured
6. ✅ Load testing performed
7. ✅ Disaster recovery plan documented
8. ✅ Security review completed

## Maintenance Tasks

Regular maintenance tasks include:

1. Reviewing and rotating credentials
2. Updating container images with security patches
3. Monitoring and optimizing database performance
4. Reviewing CloudWatch logs for errors
5. Testing backup restoration procedures

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Check security group rules
   - Verify subnet routing
   - Test connectivity from ECS tasks

2. **ECS Task Failures**:
   - Check task definition
   - Review CloudWatch logs
   - Verify secrets access

3. **Load Balancer Health Check Failures**:
   - Confirm health check endpoint is working
   - Verify target group settings
   - Check network routes

For detailed monitoring and maintenance, consider using AWS X-Ray for distributed tracing and AWS CloudWatch Synthetics for canary testing.