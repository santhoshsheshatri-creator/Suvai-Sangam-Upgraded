import { staticMealPlans } from "../data/staticMealPlans";

export interface UserProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number;
  height: number;
  goals: string[];
  dietType: string[];
  healthFocus: string[];
  activityLevel: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active';
  affordability: {
    item: string;
    frequency: 'daily' | 'weekly' | 'rarely' | 'never';
  }[];
  region: string; // Default to Tamil Nadu
  duration: '7-day';
  language: 'english' | 'tamil';
}

/**
 * Calculates the Basal Metabolic Rate (BMR) using the Mifflin-St Jeor Equation.
 */
function calculateBMR(profile: UserProfile): number {
  const { weight, height, age, gender } = profile;
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * Calculates the Total Daily Energy Expenditure (TDEE).
 */
function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const activityMultipliers = {
    'sedentary': 1.2,
    'lightly-active': 1.375,
    'moderately-active': 1.55,
    'very-active': 1.725
  };
  return Math.round(bmr * activityMultipliers[profile.activityLevel]);
}

/**
 * Scales the portions in a meal string based on a scale factor.
 * Example: "3 Idlis" with scale 0.7 -> "2 Idlis"
 */
function scalePortions(mealStr: string, scaleFactor: number): string {
  if (!mealStr || scaleFactor === 1) return mealStr;

  // Regex to find numbers followed by units (g, ml, Nos, cups, etc.)
  // Supports integers and decimals
  const regex = /(\d+(?:\.\d+)?)\s*(g|ml|Nos|cups|cup|kcal|L|kg|கி\.கி|லிட்டர்|கட்டு|டஜன்)/gi;

  return mealStr.replace(regex, (match, p1, p2) => {
    const num = parseFloat(p1);
    const scaled = Math.round(num * scaleFactor * 10) / 10; // Round to 1 decimal
    
    // For "Nos" (count) or Tamil count units, we usually want integers
    const countUnits = ['nos', 'கட்டு', 'டஜன்'];
    if (countUnits.includes(p2.toLowerCase())) {
      const roundedNos = Math.max(1, Math.round(num * scaleFactor));
      return `${roundedNos} ${p2}`;
    }

    return `${scaled} ${p2}`;
  });
}

/**
 * Generates a deterministic Tamil meal plan based on user profile.
 * This replaces the AI generation entirely for 100% reliability and speed.
 */
export async function generateTamilMealPlan(profile: UserProfile): Promise<any> {
  // 1. Calculate target calories based on goals
  const tdee = calculateTDEE(profile);
  let targetCalories = tdee;

  const isWeightLoss = profile.goals.includes('weight-loss') || profile.goals.includes('fat-loss');
  const isWeightGain = profile.goals.includes('weight-gain');
  const isMuscleBuilding = profile.goals.includes('muscle-building');
  const isMuscleGain = isWeightGain || isMuscleBuilding || profile.goals.some(g => g.toLowerCase().includes('bulk'));

  if (isWeightLoss) {
    targetCalories -= 500; // Caloric deficit
  } else if (isMuscleGain) {
    targetCalories += 500; // Caloric surplus
  }

  // 2. Determine the best static plan key
  const hasNonVeg = profile.dietType.some(d => d.toLowerCase().includes('non'));
  const isVeg = !hasNonVeg && profile.dietType.some(d => 
    d.toLowerCase() === 'veg' || 
    d.toLowerCase() === 'vegan' || 
    d.toLowerCase().includes('vegetarian')
  );

  let planKey = isVeg ? "vegetarian-weight-loss" : "non-vegetarian-weight-loss";

  // Priority 1: Goals and Diet Type
  const isMaintenance = profile.goals.includes('maintenance');
  const isAthletic = profile.goals.includes('athletic-performance');
  
  if (isAthletic) {
    // Athletic performance plan in static data is mixed (non-veg). 
    // If user is veg, we use the muscle gain veg plan as a base.
    planKey = isVeg ? "vegetarian-muscle-gain" : "athletic-performance";
  } else if (isMaintenance) {
    // General maintenance plan is mixed. If veg, use weight loss veg plan as base (will be scaled up anyway).
    planKey = isVeg ? "vegetarian-weight-loss" : "general-maintenance";
  } else if (isMuscleGain) {
    planKey = isVeg ? "vegetarian-muscle-gain" : "non-vegetarian-muscle-gain";
  } else if (isWeightLoss) {
    planKey = isVeg ? "vegetarian-weight-loss" : "non-vegetarian-weight-loss";
  }

  // Priority 2: Health Focus (Only override if the plan is compatible with diet type)
  if (profile.healthFocus && profile.healthFocus.length > 0 && !isMuscleGain && !isAthletic) {
    const focus = profile.healthFocus[0];
    const vegOnlyHealthPlans = ["diabetes-friendly", "digestion-friendly"];
    
    let potentialKey = "";
    if (focus === 'diabetes') potentialKey = "diabetes-friendly";
    else if (focus === 'pcos') potentialKey = "pcos-friendly";
    else if (focus === 'heart-health') potentialKey = "heart-health-friendly";
    else if (focus === 'thyroid') potentialKey = "thyroid-friendly";
    else if (focus === 'digestion') potentialKey = "digestion-friendly";
    else if (focus === 'skin-hair') potentialKey = "skin-hair-friendly";

    if (potentialKey) {
      const isPlanVegOnly = vegOnlyHealthPlans.includes(potentialKey);
      
      if (isVeg) {
        // If user is vegetarian, only allow them to use strictly vegetarian health plans
        if (isPlanVegOnly) {
          planKey = potentialKey;
        }
        // If it's a mixed plan (like PCOS), we keep the goal-based veg plan 
        // and just add the specialized tips later.
      } else {
        // Non-vegetarians can use any plan
        planKey = potentialKey;
      }
    }
  }

  const basePlan = staticMealPlans[planKey];
  
  if (!basePlan) {
    throw new Error(`Meal plan category "${planKey}" not found in dataset.`);
  }

  // 3. Personalize the plan (Deep clone to avoid modifying the original)
  const personalizedPlan = JSON.parse(JSON.stringify(basePlan));

  // 4. Scale portions to match target calories accurately
  // We calculate the average calories of the base plan to find the scale factor
  const baseAvgCalories = personalizedPlan.days.reduce((acc: number, day: any) => acc + day.totalCalories, 0) / personalizedPlan.days.length;
  const scaleFactor = targetCalories / baseAvgCalories;

  personalizedPlan.days.forEach((day: any) => {
    // Scale the day's total calories display
    day.totalCalories = Math.round(day.totalCalories * scaleFactor);
    
    // Scale each meal's portions
    Object.keys(day.meals).forEach(mealType => {
      day.meals[mealType] = scalePortions(day.meals[mealType], scaleFactor);
    });

    // Scale macros (approximate)
    if (day.macros) {
      Object.keys(day.macros).forEach(macro => {
        const val = parseInt(day.macros[macro]);
        if (!isNaN(val)) {
          day.macros[macro] = `${Math.round(val * scaleFactor)}g`;
        }
      });
    }
  });

  // 5. Scale the grocery list
  if (personalizedPlan.groceryList) {
    personalizedPlan.groceryList = personalizedPlan.groceryList.map((item: string) => 
      scalePortions(item, scaleFactor)
    );
  }
  
  // Update plan name with user's name if available or just generic personalization
  let displayGoal = "";
  if (isWeightGain) displayGoal = profile.language === 'tamil' ? "எடை அதிகரிப்பு" : "Weight Gain";
  else if (isMuscleBuilding) displayGoal = profile.language === 'tamil' ? "தசை வளர்ச்சி" : "Muscle Building";
  else if (isWeightLoss) displayGoal = profile.language === 'tamil' ? "எடை குறைப்பு" : "Weight Loss";
  else displayGoal = personalizedPlan.planName.split('(')[0].trim();

  const dietPrefix = hasNonVeg 
    ? (profile.language === 'tamil' ? "அசைவ" : "Non-Veg") 
    : (profile.language === 'tamil' ? "சைவ" : "Veg");

  personalizedPlan.planName = `${dietPrefix} ${displayGoal} - Personalized for ${profile.age}y ${profile.gender}`;
  
  // Add a personalized tip about their specific calorie target
  personalizedPlan.tips.unshift(`உங்கள் தினசரி கலோரி இலக்கு: ${targetCalories} kcal (Your daily calorie target: ${targetCalories} kcal)`);
  
  // Add health focus specific tips
  if (profile.healthFocus && profile.healthFocus.length > 0) {
    const healthTips: Record<string, string> = {
      'diabetes': 'சர்க்கரை நோய் (Diabetes): இனிப்பு மற்றும் வெள்ளை அரிசியை தவிர்த்து, நார்ச்சத்து மிகுந்த சிறுதானியங்களை அதிகம் சேர்க்கவும்.',
      'pcos': 'PCOS/PCOD: சுத்திகரிக்கப்பட்ட கார்போஹைட்ரேட்டுகளை குறைத்து, புரதம் மற்றும் ஆரோக்கியமான கொழுப்புகளை அதிகரிக்கவும்.',
      'thyroid': 'தைராய்டு (Thyroid): அயோடின் கலந்த உப்பு மற்றும் நார்ச்சத்து மிகுந்த உணவுகளை சீராக உட்கொள்ளவும்.',
      'heart-health': 'இதய ஆரோக்கியம் (Heart Health): உப்பின் அளவை குறைத்து, ஒமேகா-3 நிறைந்த நட்ஸ் மற்றும் மீன் வகைகளை சேர்க்கவும்.',
      'digestion': 'செரிமானம் (Digestion): நார்ச்சத்துள்ள காய்கறிகள் மற்றும் புரோபயாடிக் நிறைந்த தயிர்/மோர் அதிகம் சேர்க்கவும்.',
      'skin-hair': 'தோல் மற்றும் முடி (Skin & Hair): வைட்டமின் சி மற்றும் ஈ நிறைந்த பழங்கள் மற்றும் நட்ஸ் வகைகளை அதிகம் சேர்க்கவும்.'
    };

    profile.healthFocus.forEach(focus => {
      if (healthTips[focus]) {
        personalizedPlan.tips.push(healthTips[focus]);
      }
    });
  }

  // Simulate a small delay for better UX (so it doesn't feel "too" instant, though it is)
  await new Promise(resolve => setTimeout(resolve, 400));

  return {
    ...personalizedPlan,
    calculatedTDEE: tdee,
    targetCalories: targetCalories,
    generatedAt: new Date().toISOString(),
    isDeterministic: true
  };
}
