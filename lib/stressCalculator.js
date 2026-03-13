/**
 * Calculates a stress score (0-100) based on daily habit inputs.
 * Lower score = less stress. Higher score = more stress.
 */

export function calculateStressScore(data) {
  let score = 0;
  let factors = 0;

  // 1. Sleep Duration Score (0-20 points)
  // Optimal: 7-9 hours. Less or more adds stress.
  if (data.wake_time && data.sleep_time) {
    const sleepHours = calculateSleepHours(data.sleep_time, data.wake_time);
    if (sleepHours < 4) score += 20;
    else if (sleepHours < 5) score += 16;
    else if (sleepHours < 6) score += 12;
    else if (sleepHours < 7) score += 6;
    else if (sleepHours <= 9) score += 0;
    else if (sleepHours <= 10) score += 4;
    else score += 8;
    factors++;
  }

  // 2. Food Habits Score (0-15 points)
  if (data.food_habits) {
    const foodMap = {
      'excellent': 0, 'good': 3, 'average': 7, 'poor': 12, 'very_poor': 15
    };
    score += foodMap[data.food_habits] || 7;
    factors++;
  }

  // 3. Protein Intake Score (0-10 points)
  // Based on daily grams - typical adult needs 50-60g
  if (data.protein_intake !== undefined) {
    const protein = Number(data.protein_intake);
    if (protein >= 50) score += 0;
    else if (protein >= 40) score += 3;
    else if (protein >= 25) score += 6;
    else score += 10;
    factors++;
  }

  // 4. Nutrient Intake Score (0-10 points)  
  // Percentage of recommended daily nutrients met
  if (data.nutrient_intake !== undefined) {
    const nutrients = Number(data.nutrient_intake);
    if (nutrients >= 80) score += 0;
    else if (nutrients >= 60) score += 3;
    else if (nutrients >= 40) score += 6;
    else score += 10;
    factors++;
  }

  // 5. Typing Speed / Motor Agitation (0-10 points)
  // Higher typing speed can indicate anxiety
  if (data.typing_speed !== undefined) {
    const speed = Number(data.typing_speed);
    if (speed <= 40) score += 0;
    else if (speed <= 60) score += 2;
    else if (speed <= 80) score += 5;
    else if (speed <= 100) score += 7;
    else score += 10;
    factors++;
  }

  // 6. Anxiousness (0-15 points) - self-reported 1-10
  if (data.anxiousness !== undefined) {
    score += Math.round((Number(data.anxiousness) / 10) * 15);
    factors++;
  }

  // 7. Nervousness (0-15 points) - self-reported 1-10
  if (data.nervousness !== undefined) {
    score += Math.round((Number(data.nervousness) / 10) * 15);
    factors++;
  }

  // 8. Custom factors (0-5 points each)
  if (data.custom_factors && typeof data.custom_factors === 'object') {
    Object.values(data.custom_factors).forEach(val => {
      const numVal = Number(val);
      if (!isNaN(numVal)) {
        score += Math.round((numVal / 10) * 5);
        factors++;
      }
    });
  }

  // Normalize to 0-100
  const maxPossible = 20 + 15 + 10 + 10 + 10 + 15 + 15 + (data.custom_factors ? Object.keys(data.custom_factors).length * 5 : 0);
  const normalizedScore = Math.min(100, Math.round((score / maxPossible) * 100));

  return {
    score: normalizedScore,
    level: getStressLevel(normalizedScore),
    color: getStressColor(normalizedScore),
    factorsAnalyzed: factors,
    breakdown: {
      sleep: data.wake_time && data.sleep_time ? calculateSleepHours(data.sleep_time, data.wake_time) : null,
      rawScore: score,
      maxPossible
    }
  };
}

function calculateSleepHours(sleepTime, wakeTime) {
  const [sh, sm] = sleepTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let sleepMinutes = (wh * 60 + wm) - (sh * 60 + sm);
  if (sleepMinutes < 0) sleepMinutes += 24 * 60;
  return sleepMinutes / 60;
}

export function getStressLevel(score) {
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Moderate';
  if (score <= 80) return 'High';
  return 'Critical';
}

export function getStressColor(score) {
  if (score <= 30) return '#00e676';
  if (score <= 60) return '#ffca28';
  if (score <= 80) return '#ff7043';
  return '#ef5350';
}
