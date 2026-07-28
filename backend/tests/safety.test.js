const { screenMessage, buildResourceCard, crisisPauseMessage } = require('../src/services/safety');

describe('screenMessage', () => {
  test('flags suicidal language as self_harm', () => {
    expect(screenMessage("I've been thinking about killing myself")).toContain('self_harm');
    expect(screenMessage('sometimes I just want to die')).toContain('self_harm');
    expect(screenMessage("there's no point in living anymore")).toContain('self_harm');
    expect(screenMessage("I don't want to wake up tomorrow")).toContain('self_harm');
  });

  test('flags physical abuse language as abuse', () => {
    expect(screenMessage('he hits me when he gets angry')).toContain('abuse');
    expect(screenMessage("I'm afraid of my husband")).toContain('abuse');
    expect(screenMessage("she won't let me see my friends")).toContain('abuse');
    expect(screenMessage('he threatened to take the kids')).toContain('abuse');
    expect(screenMessage('he controls my money and where I go')).toContain('abuse');
  });

  test('flags threats toward others as harm_to_others', () => {
    expect(screenMessage('sometimes I want to hurt him for what he did')).toContain('harm_to_others');
  });

  test('does not flag ordinary relationship talk', () => {
    expect(screenMessage('we keep arguing about the dishes')).toEqual([]);
    expect(screenMessage('I feel unheard when he interrupts me')).toEqual([]);
    expect(screenMessage('date night was really nice this week')).toEqual([]);
  });

  test('handles empty and non-string input', () => {
    expect(screenMessage('')).toEqual([]);
    expect(screenMessage(null)).toEqual([]);
    expect(screenMessage(undefined)).toEqual([]);
  });

  test('figures of speech still pass the screen (precision comes from the classifier)', () => {
    // Documenting intent: the screen is high-recall, so this DOES flag —
    // the classifier layer is responsible for calling it 'none'.
    expect(screenMessage('this traffic makes me want to die').length).toBeGreaterThan(0);
  });
});

describe('buildResourceCard', () => {
  test('individual abuse card includes the DV hotline', () => {
    const card = buildResourceCard({ level: 'crisis', category: 'abuse' }, 'individual');
    expect(card.resources.some(r => r.name.includes('Domestic Violence'))).toBe(true);
    expect(card.disclaimer).toMatch(/not a therapist/);
  });

  test('joint abuse card swaps DV resources for the generic card', () => {
    // A DV hotline on a shared screen can endanger the discloser
    const card = buildResourceCard({ level: 'crisis', category: 'abuse' }, 'joint');
    expect(card.resources.some(r => r.name.includes('Domestic Violence'))).toBe(false);
    expect(card.resources.length).toBeGreaterThan(0);
  });

  test('self_harm card includes 988', () => {
    const card = buildResourceCard({ level: 'concern', category: 'self_harm' }, 'individual');
    expect(card.resources.some(r => r.name.includes('988'))).toBe(true);
    expect(card.level).toBe('concern');
  });
});

describe('crisisPauseMessage', () => {
  test('names that Coco is an AI', () => {
    expect(crisisPauseMessage('self_harm', 'individual')).toMatch(/AI/);
  });

  test('abuse pause in individual sessions mentions quick-exit browsing safety', () => {
    expect(crisisPauseMessage('abuse', 'individual')).toMatch(/quick-exit/);
  });

  test('abuse pause in joint sessions uses the generic wording', () => {
    expect(crisisPauseMessage('abuse', 'joint')).not.toMatch(/quick-exit/);
  });
});
