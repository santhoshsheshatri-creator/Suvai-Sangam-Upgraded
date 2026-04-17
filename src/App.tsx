import React, { useState, useEffect, useLayoutEffect, Component, ReactNode, ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  CreditCard, 
  Wallet, 
  Clock, 
  Flame, 
  ArrowRight,
  ShoppingCart,
  Info,
  Leaf,
  Heart,
  Zap,
  Star,
  Download,
  RefreshCw,
  CheckCircle,
  ArrowUp,
  Menu,
  MapPin,
  Mail,
  Plus,
  DollarSign,
  X,
  Calendar,
  LogOut,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Toaster, toast } from 'sonner';
import { generateTamilMealPlan, UserProfile } from './services/geminiService';
import { TAMIL_FOOD_FACTS } from './constants';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, onSnapshot, Timestamp,
  User, OperationType, handleFirestoreError, getDocFromServer, serverTimestamp
} from './firebase';

const FOOD_ITEMS = [
  { id: 'egg', label: 'Eggs (முட்டை)', defaultFreq: 'daily' },
  { id: 'chicken', label: 'Chicken (கோழி)', defaultFreq: 'weekly' },
  { id: 'fish', label: 'Fish (மீன்)', defaultFreq: 'weekly' },
  { id: 'mutton', label: 'Mutton (ஆடு)', defaultFreq: 'rarely' },
  { id: 'biryani', label: 'Biryani (பிரியாணி)', defaultFreq: 'weekly' },
  { id: 'paneer', label: 'Paneer (பன்னீர்)', defaultFreq: 'weekly' },
  { id: 'milk', label: 'Milk/Curd (பால்/தயிர்)', defaultFreq: 'daily' },
  { id: 'fruits', label: 'Seasonal Fruits (பழங்கள்)', defaultFreq: 'daily' },
  { id: 'nuts', label: 'Nuts (கொட்டைகள்)', defaultFreq: 'weekly' },
];

const DIET_TYPES = [
  { id: 'veg', label: 'Vegetarian (சைவம்)', icon: '🥦' },
  { id: 'non-veg', label: 'Non-Vegetarian (அசைவம்)', icon: '🍗' },
  { id: 'egg-only', label: 'Egg-only (முட்டை மட்டும்)', icon: '🥚' },
  { id: 'vegan', label: 'Vegan (சைவம் - பால் தவிர்த்த)', icon: '🌱' },
  { id: 'pescatarian', label: 'Pescatarian (மீன் மற்றும் சைவம்)', icon: '🐟' },
];

const GOALS = [
  { id: 'weight-loss', label: 'Weight Loss (எடை குறைப்பு)', icon: '🔥' },
  { id: 'weight-gain', label: 'Weight Gain (எடை அதிகரிப்பு)', icon: '💪' },
  { id: 'maintenance', label: 'Maintenance (பராமரிப்பு)', icon: '⚖️' },
  { id: 'muscle-building', label: 'Muscle Building (தசை வளர்ச்சி)', icon: '🏋️' },
  { id: 'fat-loss', label: 'Fat Loss (கொழுப்பு குறைப்பு)', icon: '📉' },
  { id: 'athletic-performance', label: 'Athletic Performance (விளையாட்டு திறன்)', icon: '🏃' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary (குறைந்த செயல்பாடு)', desc: 'Office job, little exercise', icon: '🪑' },
  { id: 'lightly-active', label: 'Lightly Active (மிதமான செயல்பாடு)', desc: 'Light exercise 1-3 days/week', icon: '🚶' },
  { id: 'moderately-active', label: 'Moderately Active (சுறுசுறுப்பான)', desc: 'Moderate exercise 3-5 days/week', icon: '🏃' },
  { id: 'very-active', label: 'Very Active (மிகவும் சுறுசுறுப்பான)', desc: 'Hard exercise 6-7 days/week', icon: '🚴' },
];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  home: { tamil: 'முகப்பு', english: 'Home' },
  diet: { tamil: 'உணவு முறை', english: 'Diet Plan' },
  advice: { tamil: 'அறிவுரை', english: 'Advice' },
  step: { tamil: 'படி', english: 'Step' },
  of: { tamil: 'இல்', english: 'of' },
  selectGoal: { tamil: 'உங்கள் இலக்கைத் தேர்ந்தெடுக்கவும்', english: 'Select Your Goal' },
  whatGoal: { tamil: 'உங்கள் ஆரோக்கிய இலக்கு என்ன?', english: 'What is your health goal?' },
  activityFocus: { tamil: 'செயல்பாடு & கவனம்', english: 'Activity & Focus' },
  howActive: { tamil: 'நீங்கள் எவ்வளவு சுறுசுறுப்பாக இருக்கிறீர்கள்?', english: 'How active are you?' },
  dietaryChoices: { tamil: 'உணவு விருப்பங்கள்', english: 'Dietary Choices' },
  selectPreference: { tamil: 'உங்கள் விருப்பத்தைத் தேர்ந்தெடுக்கவும்', english: 'Select your preference' },
  budgetStaples: { tamil: 'பட்ஜெட் & அடிப்படை உணவுகள்', english: 'Budget & Staples' },
  affordItems: { tamil: 'இந்த பொருட்களை எவ்வளவு அடிக்கடி வாங்க முடியும்?', english: 'How often can you afford these items?' },
  generatePlan: { tamil: 'உங்கள் தனிப்பயனாக்கப்பட்ட உணவுத் திட்டத்தைக் காணுங்கள்', english: 'Reveal Your Personalized Diet Plan' },
  downloadPdf: { tamil: 'உங்கள் ₹20 ஆரோக்கிய வழிகாட்டியைப் பெறுங்கள்', english: 'Get Your ₹20 Health Guide' },
  back: { tamil: 'பின்னால்', english: 'Back' },
  nextStep: { tamil: 'அடுத்த படி', english: 'Next Step' },
  limitedOffer: { tamil: 'அறிமுகச் சலுகை: ₹20 மட்டும் (உண்மையான விலை ₹199)', english: 'Launch Offer: Only ₹20 (Original Price ₹199)' },
  whatsappSupport: { tamil: 'வாட்ஸ்அப்பில் உதவி வேண்டுமா?', english: 'Need help on WhatsApp?' },
  doctorVerified: { tamil: 'ஊட்டச்சத்து நிபுணரால் அங்கீகரிக்கப்பட்டது', english: 'Nutritionist Approved' }
};

const COMMON_TRANSLATIONS: Record<string, string> = {
  'இட்லி': 'Idli',
  'இஞ்சி சட்னி': 'Ginger Chutney',
  'சாம்பார்': 'Sambar',
  'காய்கறி சாம்பார்': 'Veg Sambar',
  'தோசை': 'Dosa',
  'சப்பாத்தி': 'Chappathi',
  'சாதம்': 'Rice',
  'பொரியல்': 'Stir-fry',
  'மோர்': 'Buttermilk',
  'தயிர்': 'Curd',
  'ராகி': 'Ragi',
  'கூழ்': 'Porridge',
  'இடியாப்பம்': 'Idiyappam',
  'குருமா': 'Kurma',
  'உப்புமா': 'Upma',
  'சட்னி': 'Chutney',
  'பருப்பு': 'Dal',
  'கீரை': 'Spinach',
  'பழம்': 'Fruit',
  'பழங்கள்': 'Fruits',
  'பப்பாளி': 'Papaya',
  'கொய்யா': 'Guava',
  'ஆரஞ்சு': 'Orange',
  'தர்பூசணி': 'Watermelon',
  'இளநீர்': 'Tender Coconut',
  'சுண்டல்': 'Sundal',
  'வேர்க்கடலை': 'Peanuts',
  'முட்டை': 'Egg',
  'மீன்': 'Fish',
  'கோழி': 'Chicken',
  'பிரியாணி': 'Biryani',
  'கிச்சடி': 'Khichdi',
  'அடை': 'Adai',
  'அவல்': 'Poha',
  'கஞ்சி': 'Porridge',
  'மதிய உணவு': 'Lunch',
  'காலை உணவு': 'Breakfast',
  'இரவு உணவு': 'Dinner',
  'நடுத்தர அளவு': 'Medium Size',
  'சிறிய அளவு': 'Small Size',
  'பெரிய அளவு': 'Large Size',
  'காய்கறி': 'Vegetable',
  'காய்கறிகள்': 'Vegetables',
  'கூட்டு': 'Kootu',
  'வறுவல்': 'Fry',
  'வத்தல்': 'Dried Fry',
  'ரசம்': 'Rasam',
  'துண்டுகள்': 'Slices',
  'வேகவைத்த': 'Boiled/Steamed',
  'வறுத்த': 'Roasted',
  'முளைகட்டிய': 'Sprouted',
  'சிறுதானிய': 'Millet',
  'கோதுமை': 'Wheat',
  'ரவை': 'Rava',
  'கைக்குத்தல்': 'Brown (Rice)',
  'சிவப்பு': 'Red',
  'வெள்ளை': 'White',
  'கருப்பு': 'Black',
  'பச்சை': 'Green',
  'மஞ்சள்': 'Yellow',
  'மிளகு': 'Pepper',
  'இஞ்சி': 'Ginger',
  'பூண்டு': 'Garlic',
  'வெங்காயம்': 'Onion',
  'தக்காளி': 'Tomato',
  'உருளைக்கிழங்கு': 'Potato',
  'கத்திரிக்காய்': 'Brinjal',
  'வெண்டைக்காய்': "Lady's Finger",
  'முட்டைக்கோஸ்': 'Cabbage',
  'கேரட்': 'Carrot',
  'பீன்ஸ்': 'Beans',
  'அவரைக்காய்': 'Broad Beans',
  'கோவக்காய்': 'Ivy Gourd',
  'சுண்டைக்காய்': 'Turkey Berry',
  'வாழைக்காய்': 'Plantain',
  'முருங்கைக்காய்': 'Drumstick',
  'பாகற்காய்': 'Bitter Gourd',
  'புடலங்காய்': 'Snake Gourd',
  'பீர்க்கங்காய்': 'Ridge Gourd',
  'சுரைக்காய்': 'Bottle Gourd',
  'பூசணிக்காய்': 'Pumpkin',
  'ஓட்ஸ்': 'Oats',
  'பால்': 'Milk',
  'வாழைப்பழம்': 'Banana',
  'நட்ஸ்': 'Nuts',
  'வெள்ளைக்கரு': 'Egg White',
  'மட்டன்': 'Mutton',
  'பன்னீர்': 'Paneer',
  'தால்': 'Dal',
  'புரத பானம்': 'Protein Shake',
  'ஆப்பிள்': 'Apple',
  'பாதாம்': 'Almonds',
  'ஆம்லெட்': 'Omelette',
  'முழு முட்டைகள்': 'Whole Eggs',
  'பிரட்': 'Bread',
  'மார்பகம்': 'Breast',
  'பானம்': 'Drink',
  'வெண்ணெய்': 'Butter',
  'ஆற்றல்': 'Energy',
  'தசை': 'Muscle',
  'மீட்பு': 'Recovery',
  'மற்றும்': 'and',
  'உப்பு சேர்க்காமல்': 'No Salt',
  'அதிக காய்கறிகளுடன்': 'With Extra Veggies',
  'பருப்பு அதிகம் சேர்த்தது': 'High Protein',
  'ஒரு கைப்பிடி அளவு': 'One Handful',
  'வெங்காயம் மற்றும் மோர் கலந்தது': 'With Onion & Buttermilk',
  'மிளகுத்தூள் தூவியது': 'With Pepper Powder',
  'குறைந்த கொழுப்பு தயிர்': 'Low Fat Curd',
  'ஒரு கிண்ணம்': 'One Bowl',
  'எண்ணெய் குறைவாக': 'Less Oil',
  'வழுக்கை இல்லாமல்': 'Without Pulp',
  'காய்கறிகள் மற்றும் மோர் சேர்த்தது': 'With Veggies & Buttermilk',
  'தவிடு நீக்கப்படாததால் நார்சத்து அதிகம் கொண்டது': 'High Fiber',
  'வார இறுதியில் மிதமான உணவு செரிமானத்திற்கு நல்லது': 'Light Weekend Meal',
};

const FormattedText = ({ text, language }: { text: string, language: string }) => {
  if (!text) return null;
  
  // Check if it's a simple sentence with English in parentheses at the end
  // Example: "Tamil sentence. (English sentence.)"
  const sentenceMatch = text.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (sentenceMatch && !text.includes(' - ') && !text.includes('மற்றும்')) {
    const tamil = sentenceMatch[1].trim();
    const english = sentenceMatch[2].trim();
    
    if (language === 'tamil') return <span className="font-tamil-stylish font-bold tamil-highlight text-[var(--color-primary)]">{tamil}</span>;
    if (language === 'english') return <span className="font-sans font-extrabold text-[var(--color-royal-blue)] tracking-tight">{english}</span>;
    return (
      <div className="flex flex-col gap-1.5">
        <span className="font-tamil-stylish font-bold text-[var(--color-primary)] tamil-highlight text-xl md:text-2xl">{tamil}</span>
        <span className="text-[0.75em] font-sans font-bold uppercase tracking-widest text-[var(--color-royal-blue)]/70 italic">{english}</span>
      </div>
    );
  }

  // Handle complex bilingual strings like "Tamil (English) - Qty (QtyEng) and Tamil (English)"
  // Split by "மற்றும்" (and) to handle multiple items
  const items = text.split(/\s+மற்றும்\s+/);

  const parsePart = (part: string) => {
    let tamil = part;
    let english = "";
    let tamilQty = "";
    let englishQty = "";

    const mainParts = part.split(/\s+-\s+/);
    
    const parseSubPart = (sub: string) => {
      const match = sub.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        const tamilPart = match[1].trim();
        const parenContent = match[2].trim();
        
        // Check if parenContent itself is bilingual "Tamil - English"
        const innerMatch = parenContent.match(/^(.*?)\s+-\s+(.*)$/);
        if (innerMatch) {
          const left = innerMatch[1].trim();
          const right = innerMatch[2].trim();
          // Only treat as bilingual if one side has Tamil and the other doesn't
          const leftHasTamil = /[\u0B80-\u0BFF]/.test(left);
          const rightHasTamil = /[\u0B80-\u0BFF]/.test(right);
          
          if (leftHasTamil !== rightHasTamil) {
            return { 
              t: `${tamilPart} (${left})`, 
              e: `${tamilPart} (${right})` 
            };
          }
        }
        
        return { t: tamilPart, e: parenContent };
      }
      
      const trimmed = sub.trim();
      
      // If it's just a number or has numbers with common units (g, ml, Nos)
      if (/^\d+(\.\d+)?\s*(g|ml|nos|kcal|kg|l)?$/i.test(trimmed)) {
        return { t: trimmed, e: trimmed };
      }

      // Handle comma separated list
      if (trimmed.includes(',')) {
        const parts = trimmed.split(/\s*,\s*/);
        const translatedParts = parts.map(p => {
          const pTrimmed = p.trim();
          if (COMMON_TRANSLATIONS[pTrimmed]) return COMMON_TRANSLATIONS[pTrimmed];
          return pTrimmed;
        });
        
        const hasTranslation = translatedParts.some((p, i) => p !== parts[i].trim());
        if (hasTranslation) {
          return { t: trimmed, e: translatedParts.join(', ') };
        }
      }

      if (COMMON_TRANSLATIONS[trimmed]) {
        return { t: trimmed, e: COMMON_TRANSLATIONS[trimmed] };
      }
      
      // If it's pure English (no Tamil characters), use it as English
      if (!/[\u0B80-\u0BFF]/.test(trimmed)) {
        return { t: "", e: trimmed };
      }
      
      return { t: trimmed, e: "" };
    };

    if (mainParts.length > 1) {
      const nameObj = parseSubPart(mainParts[0]);
      const qtyObj = parseSubPart(mainParts[1]);
      tamil = nameObj.t;
      tamilQty = qtyObj.t;
      english = nameObj.e;
      englishQty = qtyObj.e;
    } else {
      const nameObj = parseSubPart(mainParts[0]);
      tamil = nameObj.t;
      english = nameObj.e;
    }

    return { tamil, english, tamilQty, englishQty };
  };

  const parsedItems = items.map(parsePart);

  if (language === 'tamil') {
    return (
      <span className="font-tamil-stylish">
        {parsedItems.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && " மற்றும் "}
            {item.tamil ? (
              <span className="tamil-highlight">{item.tamil}</span>
            ) : (
              <span className="font-sans font-bold">{item.english}</span>
            )}
            {item.tamilQty && <span className="text-[0.9em] opacity-80 ml-1">({item.tamilQty})</span>}
          </React.Fragment>
        ))}
      </span>
    );
  }

  if (language === 'english') {
    return (
      <span className="font-sans">
        {parsedItems.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-[var(--color-muted)] mx-1">and</span>}
            {item.english ? (
              <span className="font-extrabold text-[var(--color-royal-blue)]">{item.english}</span>
            ) : (
              <span className="font-extrabold text-[var(--color-royal-blue)]">{item.tamil}</span>
            )}
            {item.englishQty && <span className="text-[0.85em] font-bold text-[var(--color-deep-orange)] ml-1">({item.englishQty})</span>}
          </React.Fragment>
        ))}
      </span>
    );
  }
  
  return (
    <span className="flex flex-col gap-3">
      {parsedItems.map((item, idx) => (
        <div key={idx} className="flex flex-col leading-tight bg-gradient-to-r from-[var(--color-sandal)] to-white p-4 rounded-2xl border-l-8 border-[var(--color-primary)] shadow-md hover:shadow-lg transition-all group/item">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-bold font-tamil-stylish text-[1.25em] text-[var(--color-primary)] tamil-highlight">
              {item.tamil}
            </span>
            {item.tamilQty && (
              <span className="text-[0.9em] font-tamil-body text-[var(--color-deep-orange)] font-bold bg-[var(--color-deep-orange)]/10 px-2 py-0.5 rounded-lg">
                {item.tamilQty}
              </span>
            )}
          </div>
          {(item.english || item.englishQty) && (
            <div className="flex flex-wrap items-baseline gap-2 mt-2 pt-2 border-t border-dashed border-gray-100">
              <span className="text-[0.7em] font-sans font-black uppercase tracking-[0.15em] text-[var(--color-royal-blue)]">
                {item.english || item.tamil}
              </span>
              {item.englishQty && (
                <span className="text-[0.65em] font-sans text-[var(--color-deep-orange)] font-black uppercase tracking-tighter">
                  ({item.englishQty})
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </span>
  );
};

const HEALTH_FOCUS = [
  { id: 'diabetes', label: 'Diabetes Friendly (சர்க்கரை நோய்)', icon: '🩸' },
  { id: 'pcos', label: 'PCOS/PCOD', icon: '🌸' },
  { id: 'thyroid', label: 'Thyroid Care (தைராய்டு)', icon: '🦋' },
  { id: 'heart-health', label: 'Heart Health (இதய ஆரோக்கியம்)', icon: '❤️' },
  { id: 'digestion', label: 'Better Digestion (செரிமானம்)', icon: '🥣' },
  { id: 'skin-hair', label: 'Skin & Hair (தோல் மற்றும் முடி)', icon: '✨' },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

const BonusesSection: React.FC<{ language: string }> = ({ language }) => {
  const bonuses = [
    {
      title: language === 'english' ? 'Restaurant Survival Cheat Sheet' : 'உணவக உயிர்வாழும் குறிப்பு தாள்',
      desc: language === 'english' ? 'Which Tamil hotel foods are safe to eat so you don\'t ruin your progress.' : 'உங்கள் முன்னேற்றத்தை சிதைக்காமல் எந்த தமிழ் ஹோட்டல் உணவுகள் சாப்பிடுவது பாதுகாப்பானது.',
      icon: <MapPin className="text-[var(--color-deep-orange)]" />
    },
    {
      title: language === 'english' ? '10-Minute "Working Pro" Meal Prep' : '10-நிமிட "வேலை செய்யும் புரோ" உணவு தயாரிப்பு',
      desc: language === 'english' ? 'How to prep your Sambar and Poriyal in bulk on Sunday so you spend zero time cooking during the week.' : 'ஞாயிற்றுக்கிழமை உங்கள் சாம்பார் மற்றும் பொரியலை மொத்தமாக தயாரிப்பது எப்படி.',
      icon: <Clock className="text-[var(--color-primary)]" />
    },
    {
      title: language === 'english' ? 'The "Sweet Tooth" Swap List' : '"இனிப்பு பிரியர்களுக்கான" மாற்று பட்டியல்',
      desc: language === 'english' ? 'Tamil dessert alternatives that satisfy cravings without the sugar spike.' : 'சர்க்கரை அதிகரிப்பு இல்லாமல் இனிப்பு ஆசைகளை பூர்த்தி செய்யும் தமிழ் இனிப்பு மாற்றுகள்.',
      icon: <Star className="text-[var(--color-accent)]" />
    }
  ];

  return (
    <div className="space-y-8 md:space-y-12 bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-accent)]/5 p-8 md:p-16 rounded-[3rem] md:rounded-[4rem] border-2 border-[var(--color-primary)]/10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-accent)] text-[var(--color-text)] font-bold text-[10px] uppercase tracking-widest shadow-lg">
          <Zap size={14} fill="currentColor" /> Exclusive Strategy Bonuses Included
        </div>
        <h3 className="text-3xl md:text-5xl font-serif font-bold text-[var(--color-text)]">
          {language === 'english' ? 'Your Accelerator Bonuses' : 'உங்கள் முடுக்க போனஸ்கள்'}
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {bonuses.map((bonus, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-[var(--color-primary)]/5 shadow-xl hover:shadow-2xl transition-all group">
            <div className="w-16 h-16 bg-[var(--color-bg)] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
              {bonus.icon}
            </div>
            <h4 className="text-xl font-serif font-bold text-[var(--color-text)] mb-3">{bonus.title}</h4>
            <p className="text-[var(--color-muted)] text-sm leading-relaxed">{bonus.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const DayCard: React.FC<{ day: any, profile: any, language: string, index: number, isPreview?: boolean }> = ({ day, profile, language, index, isPreview = false }) => {
  const meals = [
    { label: 'Breakfast', val: day.meals?.breakfast || "N/A", icon: '🌅', color: 'var(--color-accent)' },
    { label: 'Mid-Morning', val: day.meals?.midMorning || "N/A", icon: '🍵', color: 'var(--color-leaf-medium)' },
    { label: 'Lunch', val: day.meals?.lunch || "N/A", icon: '☀️', color: 'var(--color-deep-orange)' },
    { label: 'Evening', val: day.meals?.eveningSnack || "N/A", icon: '🍎', color: 'var(--color-primary)' },
    { label: 'Dinner', val: day.meals?.dinner || "N/A", icon: '🌙', color: 'var(--color-royal-blue)' },
  ];

  // If preview, only show first two meals
  const displayedMeals = isPreview ? meals.slice(0, 2) : meals;

  return (
    <div className={`day-card-pdf bg-white rounded-[3rem] transition-all duration-500 cursor-default border-2 border-[var(--color-primary)]/5 h-full flex flex-col shadow-xl hover:shadow-3xl overflow-hidden group ${isPreview ? 'ring-8 ring-[var(--color-primary)]/5' : ''}`}>
      <div className="p-8 md:p-10 bg-gradient-to-br from-[var(--color-sandal)] to-white border-b-4 border-[var(--color-primary)]/10 flex justify-between items-center relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--color-primary)]/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative">
          <h3 className={`font-serif font-black text-3xl md:text-4xl text-[var(--color-text)] tracking-tight ${isPreview && index > 0 ? 'blur-sm select-none' : ''}`}>
            <FormattedText text={day.day} language={language} />
          </h3>
          <div className="flex items-center gap-3 mt-3">
            <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-royal-blue)] text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg">
              {day.totalCalories} kcal
            </div>
            {isPreview && (
              <div className="px-5 py-2 rounded-2xl bg-[var(--color-accent)] text-xs font-black uppercase tracking-[0.2em] text-[var(--color-text)] shadow-lg">
                Preview
              </div>
            )}
          </div>
        </div>
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-[2rem] bg-white shadow-2xl border-4 border-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
          <Clock size={32} className="md:w-10 md:h-10" />
        </div>
      </div>

      <div className="p-8 md:p-12 space-y-10 md:space-y-14 flex-grow relative bg-white">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none flex items-center justify-center overflow-hidden">
          <Utensils size={300} className="text-[var(--color-primary)] -rotate-12" />
        </div>
        {displayedMeals.map((m, i) => (
          <div key={i} className="relative pl-12 md:pl-16 border-l-4 border-gray-100 group/item hover:border-[var(--color-primary)] transition-all duration-500">
            <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-white border-4 border-gray-200 flex items-center justify-center group-hover/item:border-[var(--color-primary)] group-hover/item:scale-125 transition-all duration-500 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-gray-200 group-hover/item:bg-[var(--color-primary)]" />
            </div>
            <div className="flex items-center gap-5 mb-4">
              <div 
                className="text-3xl md:text-4xl bg-white p-3 rounded-2xl shadow-md border border-gray-50 group-hover/item:scale-110 transition-transform"
                style={{ boxShadow: `0 10px 20px -5px ${m.color}20` }}
              >
                {m.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[var(--color-muted)] group-hover/item:text-[var(--color-primary)] transition-colors">{m.label}</span>
                <div className="h-1 w-8 bg-gray-100 rounded-full mt-1 group-hover/item:w-full group-hover/item:bg-[var(--color-primary)]/30 transition-all duration-500" />
              </div>
            </div>
            <div className={`text-lg md:text-xl font-bold text-[var(--color-text)] leading-relaxed ${isPreview && index > 0 ? 'blur-md select-none' : ''}`}>
              <FormattedText text={m.val} language={language} />
            </div>
          </div>
        ))}

        {isPreview && (
          <div className="pt-6 border-t border-dashed border-[var(--color-primary)]/20 text-center">
            <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest animate-pulse">
              Unlock the full plan to see Lunch, Snacks, and Dinner
            </p>
          </div>
        )}
      </div>

      {!isPreview && day.macros && (
        <div className="mt-4 pt-8 border-t border-[var(--color-primary)]/5 space-y-6 px-6 md:px-10 pb-6 bg-[var(--color-bg)]/30">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full inline-block mb-1 macro-label-protein">Protein</p>
              <p className="font-bold text-[var(--color-text)] text-sm md:text-base">{day.macros.protein}</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text)] bg-[var(--color-accent)]/30 px-2 py-0.5 rounded-full inline-block mb-1 macro-label-carbs">Carbs</p>
              <p className="font-bold text-[var(--color-text)] text-sm md:text-base">{day.macros.carbs}</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-leaf-dark)] bg-[var(--color-leaf-dark)]/10 px-2 py-0.5 rounded-full inline-block mb-1 macro-label-fats">Fats</p>
              <p className="font-bold text-[var(--color-text)] text-sm md:text-base">{day.macros.fats}</p>
            </div>
          </div>
          
            <div className="h-3 w-full bg-white rounded-full overflow-hidden flex shadow-inner border border-[var(--color-primary)]/10">
              <div className="h-full bg-[var(--color-primary)] transition-all duration-1000" style={{ width: '30%' }} />
              <div className="h-full bg-[var(--color-accent)] transition-all duration-1000" style={{ width: '50%' }} />
              <div className="h-full bg-[var(--color-leaf-dark)] transition-all duration-1000" style={{ width: '20%' }} />
            </div>
            <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
              <span>Protein (30%)</span>
              <span>Carbs (50%)</span>
              <span>Fats (20%)</span>
            </div>
        </div>
      )}

      {day.culturalContext && (
        <div className="mt-2 mx-6 md:mx-10 mb-8 p-6 bg-white rounded-[2rem] border border-[var(--color-primary)]/5 shadow-sm">
          <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
            <Star size={12} fill="currentColor" /> Cultural Tip
          </p>
          <div className="text-sm italic text-[var(--color-muted)] leading-relaxed">
            <FormattedText text={day.culturalContext} language={language} />
          </div>
        </div>
      )}
    </div>
  );
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  public state: { hasError: boolean, error: Error | null } = { hasError: false, error: null };
  public props: { children: ReactNode };

  constructor(props: { children: ReactNode }) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
          <div className="suvai-card p-8 max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <X size={40} />
            </div>
            <h2 className="text-2xl font-serif font-bold">Oops! Something went wrong</h2>
            <p className="text-[var(--color-muted)]">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="suvai-btn w-full"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [step, setStep] = useState(0);
  const [showBMICalculator, setShowBMICalculator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'plan' | 'pdf'>('plan');
  const [plan, setPlan] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const [paid, setPaid] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'7-day'>('7-day');
  const [customItem, setCustomItem] = useState('');
  const [language, setLanguage] = useState<'bilingual' | 'tamil' | 'english'>('bilingual');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'trial' | 'accelerator' | 'vip'>('trial');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');

  const LOADING_STATUSES = [
    { en: "Analyzing your health metrics...", ta: "உங்கள் உடல் அளவீடுகளை ஆய்வு செய்கிறோம்..." },
    { en: "Consulting ancient Ayurvedic wisdom...", ta: "பண்டைய ஆயுர்வேத ஞானத்தை ஆலோசிக்கிறோம்..." },
    { en: "Calculating optimal nutrition...", ta: "உகந்த ஊட்டச்சத்தை கணக்கிடுகிறோம்..." },
    { en: "Crafting your personalized menu...", ta: "உங்கள் தனிப்பயனாக்கப்பட்ட மெனுவை உருவாக்குகிறோம்..." },
    { en: "Finalizing your heritage plan...", ta: "உங்கள் பாரம்பரிய திட்டத்தை இறுதி செய்கிறோம்..." }
  ];

  const PDF_LOADING_STATUSES = [
    { en: "Preparing your PDF document...", ta: "உங்கள் PDF ஆவணத்தைத் தயார் செய்கிறோம்..." },
    { en: "Optimizing images for high quality...", ta: "உயர்தரத்திற்காக படங்களை மேம்படுத்துகிறோம்..." },
    { en: "Structuring your 7-day plan...", ta: "உங்கள் 7-நாள் திட்டத்தை வடிவமைக்கிறோம்..." },
    { en: "Finalizing the layout...", ta: "தளவமைப்பை இறுதி செய்கிறோம்..." }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let statusInterval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setCurrentFactIndex(prev => (prev + 1) % TAMIL_FOOD_FACTS.length);
      }, 8000);

      let statusIdx = 0;
      const statuses = loadingType === 'pdf' ? PDF_LOADING_STATUSES : LOADING_STATUSES;
      setLoadingStatus(statuses[0][language === 'tamil' ? 'ta' : 'en']);
      statusInterval = setInterval(() => {
        statusIdx = (statusIdx + 1) % statuses.length;
        setLoadingStatus(statuses[statusIdx][language === 'tamil' ? 'ta' : 'en']);
      }, 4000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [loading, language, loadingType]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Sync user profile to Firestore
        const userRef = doc(db, 'users', u.uid);
        setDoc(userRef, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true }).catch(err => {
          // Only log if it's not a permission error during initial sync (might happen if rules are still propagating)
          if (!err.message.includes('insufficient permissions')) {
            handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`);
          }
        });
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Separate effect for history to handle cleanup properly
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'plans'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubHistory = onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(plans);
    }, (err) => {
      // Only handle error if user is still logged in to avoid leaking errors after logout
      if (auth.currentUser) {
        handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/plans`);
      }
    });

    return () => unsubHistory();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Signed in successfully!");
    } catch (error) {
      console.error("Login Error:", error);
      toast.error("Failed to sign in. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStep(0);
      setPlan(null);
      setPaid(false);
      toast.success("Signed out successfully!");
    } catch (error) {
      console.error("Logout Error:", error);
      toast.error("Failed to sign out.");
    }
  };

  const savePlanToFirestore = async (planData: any, paymentId: string, duration: string) => {
    if (!user) return;
    try {
      const planRef = doc(collection(db, 'users', user.uid, 'plans'));
      await setDoc(planRef, {
        userId: user.uid,
        planData,
        profile,
        createdAt: serverTimestamp(),
        duration,
        paymentId,
        tier: selectedTier
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/plans`);
    }
  };

  const saveFeedback = async () => {
    if (feedbackRating === 0) return;
    try {
      const feedbackRef = doc(collection(db, 'feedback'));
      await setDoc(feedbackRef, {
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous',
        rating: feedbackRating,
        comment: feedbackText,
        createdAt: serverTimestamp()
      });
      setFeedbackSubmitted(true);
      setFeedbackText('');
      setFeedbackRating(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'feedback');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [step, paymentStep, plan]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step, plan]);

  const [profile, setProfile] = useState<UserProfile>({
    age: '' as any,
    gender: 'male',
    weight: '' as any,
    height: '' as any,
    goals: [],
    dietType: ['non-veg'],
    activityLevel: 'sedentary',
    healthFocus: [],
    affordability: FOOD_ITEMS.map(item => ({ item: item.label, frequency: item.defaultFreq as any })),
    region: 'Tamil Nadu',
    duration: '7-day',
    language: 'english'
  });

  const formatText = (text: string) => {
    if (!text) return "";
    if (language === 'bilingual') return text;
    
    const items = text.split(/\s+மற்றும்\s+/);
    const parsedItems = items.map(part => {
      const mainParts = part.split(/\s+-\s+/);
      const parseSubPart = (sub: string) => {
        const match = sub.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) return { t: match[1].trim(), e: match[2].trim() };
        return { t: sub.trim(), e: "" };
      };

      if (mainParts.length > 1) {
        const nameObj = parseSubPart(mainParts[0]);
        const qtyObj = parseSubPart(mainParts[1]);
        return language === 'tamil' 
          ? `${nameObj.t}${qtyObj.t ? ` (${qtyObj.t})` : ''}`
          : `${nameObj.e || nameObj.t}${qtyObj.e ? ` (${qtyObj.e})` : (qtyObj.t ? ` (${qtyObj.t})` : '')}`;
      } else {
        const nameObj = parseSubPart(mainParts[0]);
        return language === 'tamil' ? nameObj.t : (nameObj.e || nameObj.t);
      }
    });

    return parsedItems.join(language === 'tamil' ? ' மற்றும் ' : ' and ');
  };

  const handleNext = () => {
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleBack = () => {
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDietType = (id: string) => {
    setProfile(prev => {
      const exists = prev.dietType.includes(id);
      if (exists) {
        if (prev.dietType.length === 1) return prev;
        return { ...prev, dietType: prev.dietType.filter(t => t !== id) };
      }
      return { ...prev, dietType: [...prev.dietType, id] };
    });
  };

  const toggleGoal = (id: string) => {
    setProfile(prev => {
      const exists = prev.goals.includes(id);
      if (exists) {
        return { ...prev, goals: prev.goals.filter(g => g !== id) };
      }
      return { ...prev, goals: [...prev.goals, id] };
    });
  };

  const toggleHealthFocus = (id: string) => {
    setProfile(prev => {
      const exists = prev.healthFocus.includes(id);
      if (exists) {
        return { ...prev, healthFocus: prev.healthFocus.filter(h => h !== id) };
      }
      return { ...prev, healthFocus: [...prev.healthFocus, id] };
    });
  };

  const selectActivity = (id: any) => {
    setProfile(prev => ({ ...prev, activityLevel: id }));
  };

  const addCustomItem = () => {
    if (!customItem.trim()) return;
    const newItem = { item: customItem, frequency: 'weekly' as any };
    setProfile(prev => ({
      ...prev,
      affordability: [...prev.affordability, newItem]
    }));
    setCustomItem('');
  };

  const updateAffordability = (itemLabel: string, freq: string) => {
    setProfile(prev => ({
      ...prev,
      affordability: prev.affordability.map(a => 
        a.item === itemLabel ? { ...a, frequency: freq as any } : a
      )
    }));
  };

  const generatePlan = async (durationOverride?: '7-day') => {
    setLoadingType('plan');
    setLoading(true);
    try {
      const currentDuration = durationOverride || selectedPlan;
      const result = await generateTamilMealPlan({ 
        ...profile, 
        duration: currentDuration, 
        language: language === 'tamil' ? 'tamil' : 'english' 
      });
      setPlan(result);
      setStep(6);
    } catch (error: any) {
      console.error("Error generating plan:", error);
      const msg = error.message || "Something went wrong. Please try again.";
      toast.error(`Error generating plan: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (tier: 'trial' | 'accelerator' | 'vip' = 'trial') => {
    setSelectedTier(tier);
    setSelectedPlan('7-day');
    setPaymentStep(true);
  };

  const confirmPayment = async () => {
    setLoading(true);
    try {
      const amounts = {
        trial: 20,
        accelerator: 99,
        vip: 499
      };
      const amount = amounts[selectedTier];
      
      // 1. Create Order on Server
      const orderRes = await fetch('/api/payment/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      
      if (!orderRes.ok) {
        const text = await orderRes.text();
        let errorMsg = 'Failed to create order';
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorData.details || errorMsg;
        } catch (e) {
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      }
      const order = await orderRes.json();

      // 2. Initialize Razorpay Checkout
      if (!(window as any).Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please check your internet connection.');
      }

      const options = {
        key: (import.meta.env.VITE_RAZORPAY_KEY_ID) || 'rzp_test_dummy_id',
        amount: order.amount,
        currency: order.currency,
        name: "Suvai Sangam",
        description: `${selectedPlan} Meal Plan`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            setLoading(true);
            // 3. Verify Payment
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }),
            });

            if (verifyRes.ok) {
              setPaid(true);
              setPaymentStep(false);
              setShowSuccess(true);
              
              // Save the existing plan to Firestore now that payment is verified
              if (plan && user) {
                await savePlanToFirestore(plan, response.razorpay_payment_id, selectedPlan);
              }
              
              setTimeout(() => setShowSuccess(false), 5000);
            } else {
              const text = await verifyRes.text();
              let errorMsg = 'Payment verification failed';
              try {
                const errorData = JSON.parse(text);
                errorMsg = errorData.error || errorData.details || errorMsg;
              } catch (e) {
                errorMsg = text || errorMsg;
              }
              toast.error(errorMsg);
            }
          } catch (err: any) {
            console.error("Verification Error:", err);
            toast.error(err.message || "An error occurred during payment verification.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: profile.name || "User",
          email: profile.email || "user@example.com",
        },
        theme: {
          color: "#1B4D1B", // leaf-dark
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay using UPI or QR',
                instruments: [
                  {
                    method: 'upi'
                  }
                ]
              }
            },
            sequence: ['block.upi'],
            preferences: {
              show_default_blocks: false
            }
          }
        }
      };

      if (typeof (window as any).Razorpay === 'undefined') {
        toast.error("Razorpay SDK failed to load. Please check your internet connection.");
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error(error.message || "Payment failed to initialize. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById('meal-plan-content');
    if (!element) {
      console.error("Meal plan content element not found");
      return;
    }

    setLoadingType('pdf');
    setLoading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pdfWidth - (2 * margin);
      
      const captureAndAdd = async (el: HTMLElement, isNewPage = false) => {
        const clone = el.cloneNode(true) as HTMLElement;
        
        // PDF styling for the section - High resolution and much larger fonts
        clone.style.width = '1400px'; // Slightly smaller width for better scaling
        clone.style.padding = '60px';
        clone.style.backgroundColor = '#ffffff';
        clone.style.color = '#000000';
        clone.style.fontFamily = '"Inter", "Mukta Malar", "Baloo Thambi 2", sans-serif';
        
        // Clean up styles for PDF and enforce much larger fonts
        const all = clone.querySelectorAll('*');
        all.forEach(item => {
          const htmlItem = item as HTMLElement;
          
          // Preserve colors and gradients but ensure they are visible
          if (htmlItem.classList.contains('tamil-highlight')) {
             htmlItem.style.backgroundColor = '#FFB300';
             htmlItem.style.padding = '0 8px';
             htmlItem.style.borderRadius = '4px';
          }

          if (htmlItem.classList.contains('macro-label-protein')) {
            htmlItem.style.backgroundColor = '#8B0000';
            htmlItem.style.color = '#ffffff';
            htmlItem.style.padding = '4px 16px';
            htmlItem.style.borderRadius = '20px';
            htmlItem.style.display = 'inline-block';
          }
          if (htmlItem.classList.contains('macro-label-carbs')) {
            htmlItem.style.backgroundColor = '#FFB300';
            htmlItem.style.color = '#000000';
            htmlItem.style.padding = '4px 16px';
            htmlItem.style.borderRadius = '20px';
            htmlItem.style.display = 'inline-block';
          }
          if (htmlItem.classList.contains('macro-label-fats')) {
            htmlItem.style.backgroundColor = '#1B4D1B';
            htmlItem.style.color = '#ffffff';
            htmlItem.style.padding = '4px 16px';
            htmlItem.style.borderRadius = '20px';
            htmlItem.style.display = 'inline-block';
          }
          if (htmlItem.classList.contains('pdf-grocery-list')) {
            htmlItem.style.backgroundColor = '#1B4D1B'; // Deep Leaf Green
            htmlItem.style.color = '#ffffff';
          }
          if (htmlItem.classList.contains('pdf-tips-section')) {
            htmlItem.style.backgroundColor = '#FFB300'; // Turmeric Yellow
            htmlItem.style.color = '#000000';
          }

          if (['H1', 'H2', 'H3', 'H4'].includes(htmlItem.tagName)) {
            htmlItem.style.fontSize = '72px';
            htmlItem.style.marginBottom = '30px';
            htmlItem.style.color = '#8B0000';
            htmlItem.style.fontWeight = '900';
            htmlItem.style.textAlign = 'center';
            htmlItem.style.display = 'block';
          } else if (['P', 'SPAN', 'LI', 'DIV'].includes(htmlItem.tagName)) {
            const currentSize = parseInt(window.getComputedStyle(htmlItem).fontSize);
            // Enforce a minimum large font size for PDF readability
            if (currentSize < 16) htmlItem.style.fontSize = '48px';
            else htmlItem.style.fontSize = (currentSize * 4.5) + 'px';
            htmlItem.style.lineHeight = '1.1';
            htmlItem.style.fontWeight = '700';
          }
          
          // Ensure icons/emojis are appropriately sized (medium size)
          if (htmlItem.innerText && htmlItem.innerText.length <= 4 && /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(htmlItem.innerText)) {
            htmlItem.style.fontSize = '32px';
            htmlItem.style.display = 'inline-block';
            htmlItem.style.lineHeight = '1';
            htmlItem.style.verticalAlign = 'middle';
            htmlItem.style.marginRight = '10px';
            // Also shrink the container of the icon if it has one
            if (htmlItem.parentElement && htmlItem.parentElement.classList.contains('bg-white')) {
              htmlItem.parentElement.style.padding = '6px';
              htmlItem.parentElement.style.borderRadius = '10px';
            }
          }

          if (htmlItem.classList.contains('bg-white') || htmlItem.classList.contains('bg-gray-50') || htmlItem.classList.contains('bg-[var(--color-card)]')) {
            htmlItem.style.backgroundColor = '#ffffff';
            htmlItem.style.border = '2px solid #8B0000';
            htmlItem.style.borderRadius = '25px';
            htmlItem.style.padding = '25px';
            htmlItem.style.marginBottom = '15px';
          }
          
          // Ensure macro bars are visible
          if (htmlItem.classList.contains('h-3') && htmlItem.classList.contains('w-full')) {
            htmlItem.style.height = '30px';
            htmlItem.style.backgroundColor = '#f3f4f6';
            htmlItem.style.border = '2px solid #e5e7eb';
            htmlItem.style.display = 'flex';
            htmlItem.style.overflow = 'hidden';
            htmlItem.style.borderRadius = '15px';
            
            // Style the children (the bars)
            Array.from(htmlItem.children).forEach((child: any) => {
              child.style.height = '100%';
              if (child.classList.contains('bg-[var(--color-primary)]')) child.style.backgroundColor = '#1B4D1B';
              if (child.classList.contains('bg-[var(--color-accent)]')) child.style.backgroundColor = '#FFB300';
              if (child.classList.contains('bg-[var(--color-leaf-dark)]')) child.style.backgroundColor = '#558B2F';
            });
          }
          
          // Reduce gaps in the PDF clone
          if (htmlItem.classList.contains('space-y-8') || htmlItem.classList.contains('md:space-y-12')) {
            htmlItem.style.gap = '15px';
          }
          if (htmlItem.classList.contains('p-6') || htmlItem.classList.contains('md:p-10')) {
            htmlItem.style.padding = '20px';
          }
        });

        // Hide non-pdf elements
        clone.querySelectorAll('.no-pdf, button').forEach(item => (item as HTMLElement).style.display = 'none');

        document.body.appendChild(clone);
        // Wait longer for fonts and images to load in the clone
        await new Promise(resolve => setTimeout(resolve, 1000));

        const dataUrl = await toJpeg(clone, {
          quality: 0.9, // Better quality
          pixelRatio: 2, 
          backgroundColor: '#ffffff',
        });

        document.body.removeChild(clone);

        if (!dataUrl) return 0;

        const imgProps = pdf.getImageProperties(dataUrl);
        let finalWidth = contentWidth;
        let finalHeight = (imgProps.height * contentWidth) / imgProps.width;

        // Scale down if it exceeds page height
        const maxHeight = pdfHeight - (2 * margin);
        if (finalHeight > maxHeight) {
          const scale = maxHeight / finalHeight;
          finalHeight = maxHeight;
          finalWidth = finalWidth * scale;
        }

        if (isNewPage) {
          pdf.addPage();
        }

        // Center horizontally and vertically
        const xPos = margin + (contentWidth - finalWidth) / 2;
        let yPos = margin;
        if (finalHeight < maxHeight) {
          yPos = margin + (maxHeight - finalHeight) / 2;
        }

        pdf.addImage(dataUrl, 'JPEG', xPos, yPos, finalWidth, finalHeight, undefined, 'FAST');
        return finalHeight;
      };

      // 1. First Page: Header + Profile Summary + BMI
      const firstPageContainer = document.createElement('div');
      firstPageContainer.style.display = 'flex';
      firstPageContainer.style.flexDirection = 'column';
      firstPageContainer.style.gap = '40px';
      firstPageContainer.style.alignItems = 'center';
      firstPageContainer.style.justifyContent = 'center';
      firstPageContainer.style.minHeight = '1600px';
      
      const header = element.querySelector('.pdf-header') as HTMLElement;
      const summary = element.querySelector('.pdf-profile-summary') as HTMLElement;
      
      if (header) {
        const hClone = header.cloneNode(true) as HTMLElement;
        hClone.style.marginBottom = '40px';
        firstPageContainer.appendChild(hClone);
      }
      
      if (summary) {
        const sClone = summary.cloneNode(true) as HTMLElement;
        sClone.style.width = '100%';
        firstPageContainer.appendChild(sClone);
      }

      // Add a nutritionist disclaimer on the first page
      const disclaimer = document.createElement('div');
      disclaimer.style.marginTop = '40px';
      disclaimer.style.padding = '40px';
      disclaimer.style.border = '4px solid #8B0000';
      disclaimer.style.borderRadius = '30px';
      disclaimer.style.textAlign = 'center';
      disclaimer.style.width = '90%';
      disclaimer.innerHTML = `
        <p style="font-size: 48px; font-weight: bold; color: #8B0000; margin-bottom: 15px;">Nutritionist Verified</p>
        <p style="font-size: 32px; color: #333; line-height: 1.4;">This meal plan has been verified with nutritional data and approved by certified nutritionists for your wellness journey.</p>
      `;
      firstPageContainer.appendChild(disclaimer);
      
      await captureAndAdd(firstPageContainer);

      // 2. Capture Days: 1 Day Per Page
      const dayCards = Array.from(element.querySelectorAll('.day-card-pdf'));
      for (let i = 0; i < dayCards.length; i++) {
        const card = dayCards[i] as HTMLElement;
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '30px';
        container.style.padding = '40px';
        container.style.minHeight = '1600px';
        container.style.justifyContent = 'center';
        
        const cardClone = card.cloneNode(true) as HTMLElement;
        cardClone.style.width = '100%';
        container.appendChild(cardClone);
        
        await captureAndAdd(container, true);
      }

      // 3. Footer Sections: Grocery List & Tips (Larger fonts)
      const groceryList = element.querySelector('.pdf-grocery-list') as HTMLElement;
      if (groceryList) {
        const container = document.createElement('div');
        container.style.minHeight = '1600px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'center';
        container.style.padding = '40px';
        container.appendChild(groceryList.cloneNode(true));
        await captureAndAdd(container, true);
      }

      const tipsSection = element.querySelector('.pdf-tips-section') as HTMLElement;
      if (tipsSection) {
        const container = document.createElement('div');
        container.style.minHeight = '1600px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'center';
        container.style.padding = '40px';
        container.appendChild(tipsSection.cloneNode(true));
        await captureAndAdd(container, true);
      }

      pdf.save(`Suvai_Sangam_Meal_Plan_${Date.now()}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("PDF generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateSamplePDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("Suvai Sangam - Sample PDF", 20, 20);
      doc.setFontSize(16);
      doc.text("This is a test PDF to verify that the download functionality is working.", 20, 40);
      doc.text("If you can see this, the PDF library is correctly initialized.", 20, 50);
      doc.text(`Generated at: ${new Date().toLocaleString()}`, 20, 70);
      doc.save("Suvai_Sangam_Sample_Test.pdf");
      console.log("Sample PDF generated successfully");
    } catch (error) {
      console.error("Sample PDF generation failed:", error);
      toast.error("Sample PDF generation failed.");
    }
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen flex flex-col selection:bg-[rgba(85,139,47,0.3)] ${language === 'tamil' ? 'font-tamil-body' : ''}`}>
      <Toaster position="top-center" richColors />
      {/* Floating Aesthetic Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[5%] w-64 h-64 bg-[var(--color-primary)]/5 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -10, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-[var(--color-leaf-medium)]/5 rounded-full blur-3xl" 
        />
        <div className="absolute top-[20%] right-[15%] opacity-[0.03]">
          <Utensils size={120} className="text-[var(--color-primary)] rotate-12" />
        </div>
        <div className="absolute bottom-[25%] left-[10%] opacity-[0.03]">
          <Leaf size={100} className="text-[var(--color-leaf-dark)] -rotate-12" />
        </div>
      </div>

      {/* Header */}
      <header className={`px-6 py-4 md:px-12 md:py-6 flex justify-between items-center sticky top-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-xl shadow-lg py-3 md:py-4 border-b border-[var(--color-primary)]/10' 
          : 'bg-transparent'
      }`}>
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setStep(0)}>
          <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-leaf-dark)] rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
            <Utensils size={18} className="md:hidden" />
            <Utensils size={24} className="hidden md:block" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-2xl font-serif font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-leaf-dark)] bg-clip-text text-transparent leading-none">Suvai Sangam</h1>
            <span className="text-[7px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[var(--color-muted)] mt-0.5 md:mt-1">Ayurvedic Inspired</span>
          </div>
        </div>

        {/* Language Selector in Top Centre - Moved slightly higher to avoid overlapping logo */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[95%] md:top-[92%] flex bg-white/95 backdrop-blur-md p-0.5 md:p-1 rounded-lg md:rounded-xl border border-[var(--color-primary)]/10 shadow-xl z-10">
          {(['tamil', 'bilingual', 'english'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2 md:px-4 py-1 md:py-1.5 text-[8px] md:text-[10px] font-bold uppercase tracking-widest rounded-md md:rounded-lg transition-all ${
                language === lang 
                  ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-leaf-dark)] text-white shadow-md' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {lang === 'tamil' ? 'தமிழ்' : lang === 'english' ? 'ENG' : 'Both'}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <nav className="hidden xl:flex items-center gap-1 bg-[var(--color-bg)]/30 p-1 rounded-xl border border-white/10">
            {[
              { id: 0, label: 'முகப்பு', en: 'Home' },
              { id: 1, label: 'உணவு', en: 'Diet' },
              { id: 6, label: 'திட்டம்', en: 'Plan' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setStep(item.id)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  (item.id === 0 && step === 0) || (item.id === 1 && (step >= 1 && step <= 5)) || (item.id === 6 && step === 6)
                    ? 'bg-white text-[var(--color-primary)] shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-primary)]'
                }`}
              >
                {item.en}
              </button>
            ))}
          </nav>

          {user ? (
            <div className="flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-bg)] transition-all shadow-sm"
              >
                <Clock size={12} />
                <span>History</span>
              </button>
              <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-0.5 pr-3 rounded-full border border-white/20">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white" />
                ) : (
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-gray-400">
                    <UserIcon size={12} />
                  </div>
                )}
                <button onClick={handleLogout} className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] hover:text-red-500 transition-colors">Logout</button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white rounded-lg md:rounded-xl border border-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-bg)] transition-all shadow-sm"
            >
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[6px] md:text-[8px]">G</div>
              <span>Sign In</span>
            </button>
          )}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl border-b border-[var(--color-primary)]/10 shadow-2xl lg:hidden z-40"
            >
              <div className="p-8 space-y-8">
                <nav className="flex flex-col gap-6">
                  {[
                    { id: 0, label: 'முகப்பு', en: 'Home' },
                    { id: 1, label: 'உணவு', en: 'Diet' },
                    { id: 6, label: 'திட்டம்', en: 'Plan' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setStep(item.id); setMobileMenuOpen(false); }}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex flex-col text-left">
                    <span className={`text-2xl font-serif font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors ${language !== 'english' ? 'font-tamil-stylish' : ''}`}>{item.label}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">{item.en}</span>
                      </div>
                      <ArrowRight size={20} className="text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                    </button>
                  ))}
                </nav>
                
                <div className="pt-8 border-t border-[var(--color-primary)]/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-4">Account</p>
                  {user ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-primary)]/5">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                            <UserIcon size={24} />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[var(--color-text)]">{user.displayName}</span>
                          <button onClick={handleLogout} className="text-[10px] font-bold uppercase tracking-widest text-red-500 text-left">Sign Out</button>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setShowHistory(true); setMobileMenuOpen(false); }}
                        className="w-full py-4 bg-white border border-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Clock size={18} />
                        <span>View History</span>
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleLogin}
                      className="w-full py-4 bg-white border border-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">G</div>
                      <span>Sign In with Google</span>
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-12 lg:px-24 py-4 md:py-8 relative z-10">
        <AnimatePresence mode="wait">
          {showHistory && user ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl md:text-5xl font-serif font-bold text-[var(--color-text)]">Your Plan History</h2>
                <button onClick={() => setShowHistory(false)} className="suvai-btn !rounded-full !px-6">Back to Home</button>
              </div>

              {history.length === 0 ? (
                <div className="bg-white p-20 rounded-[4rem] border border-[var(--color-primary)]/10 text-center space-y-6">
                  <div className="w-24 h-24 bg-[var(--color-bg)] rounded-full flex items-center justify-center text-[var(--color-primary)] mx-auto">
                    <Clock size={48} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-[var(--color-text)]">No plans yet</h3>
                  <p className="text-[var(--color-muted)]">Your purchased meal plans will appear here.</p>
                  <button onClick={() => { setShowHistory(false); setStep(1); }} className="suvai-btn">Create Your First Plan</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {history?.map((h) => (
                    <div key={h.id} className="bg-white p-8 rounded-[3rem] border border-[var(--color-primary)]/10 shadow-lg hover:shadow-2xl transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-[var(--color-bg)] rounded-2xl flex items-center justify-center text-[var(--color-primary)]">
                          <Calendar size={24} />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Generated On</p>
                          <p className="font-bold text-[var(--color-text)]">{(h.createdAt as Timestamp).toDate().toLocaleDateString()}</p>
                        </div>
                      </div>
                      <h4 className="text-xl font-serif font-bold text-[var(--color-text)] mb-2">{h.duration} Plan</h4>
                      <p className="text-sm text-[var(--color-muted)] mb-8">Goal: {h.profile.goals.join(', ')}</p>
                      <button 
                        onClick={() => {
                          setPlan(h.planData);
                          setProfile(h.profile);
                          setSelectedTier(h.tier || 'trial');
                          setPaid(true);
                          setStep(6);
                          setShowHistory(false);
                        }}
                        className="w-full py-4 bg-[var(--color-bg)] text-[var(--color-primary)] font-bold rounded-2xl hover:bg-[var(--color-primary)] hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        View Plan <ArrowRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-12 md:space-y-20"
            >
              {/* Hero Section */}
              <div className="w-full py-16 md:py-28 px-6 md:px-16 rounded-[3rem] md:rounded-[5rem] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-leaf-dark)] shadow-[0_30px_100px_-20px_rgba(139,0,0,0.3)] relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                    <rect width="100" height="100" fill="url(#grid)" />
                  </svg>
                </div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative z-10 space-y-8 max-w-4xl"
                >
                  <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/20 text-white/90">
                    <ShieldCheck size={16} className="text-[var(--color-accent)]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{language === 'english' ? TRANSLATIONS.doctorVerified.english : TRANSLATIONS.doctorVerified.tamil}</span>
                  </div>

                  <motion.button 
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    onClick={() => setStep(1)}
                    className="!rounded-full px-8 py-4 md:px-10 md:py-5 text-base md:text-lg shadow-[0_0_40px_-10px_rgba(255,179,0,0.5)] group w-full sm:w-auto max-w-[90vw] mx-auto bg-[var(--color-accent)] text-[var(--color-primary)] font-black hover:scale-110 transition-all flex items-center justify-center gap-3 border-4 border-white/20"
                  >
                    <Zap size={20} className="group-hover:bounce" />
                    <span className="whitespace-normal sm:whitespace-nowrap leading-tight">
                      {language === 'english' ? 'Start Your Transformation (₹20)' : 'உங்கள் மாற்றத்தைத் தொடங்குங்கள் (₹20)'}
                    </span>
                    <ArrowRight size={18} className="text-[var(--color-primary)]" />
                  </motion.button>
                  
                  <h2 className={`text-4xl md:text-8xl font-serif font-bold text-white leading-[1.1] tracking-tight ${language !== 'english' ? 'font-tamil-stylish' : ''}`}>
                    {language === 'english' ? 'Eat Sambar & Idli,' : 'சாம்பார் & இட்லி சாப்பிடுங்கள்,'}
                    <span className="block text-[var(--color-accent)] italic mt-2">{language === 'english' ? 'Lose Weight' : 'எடையைக் குறையுங்கள்'}</span>
                  </h2>
                  
                  <p className="text-lg md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed">
                    {language === 'english' 
                      ? "Get a personalized, 7-day 'Tamil Taste' Weight Loss Blueprint that lets you eat your favorite traditional foods while losing up to 2kg in your first week—all for the price of a single tea and vada." 
                      : "உங்களுக்குப் பிடித்த பாரம்பரிய உணவுகளைச் சாப்பிடும்போதே முதல் வாரத்தில் 2 கிலோ வரை எடையைக் குறைக்க உதவும் தனிப்பயனாக்கப்பட்ட 7-நாள் 'தமிழ் சுவை' எடை இழப்பு வரைபடத்தைப் பெறுங்கள்—அனைத்தும் ஒரு டீ மற்றும் வடையின் விலையில்."}
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-[var(--color-accent)] font-bold text-[10px] md:text-xs uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} />
                      <span>{language === 'english' ? 'Traditional Foods' : 'பாரம்பரிய உணவுகள்'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} />
                      <span>{language === 'english' ? 'No Starvation' : 'பட்டினி இல்லை'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} />
                      <span>{language === 'english' ? 'Instant WhatsApp Support' : 'உடனடி வாட்ஸ்அப் உதவி'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                    <div className="flex -space-x-4">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-[var(--color-primary)] bg-[var(--color-accent)] flex items-center justify-center text-xs font-bold text-[var(--color-primary)] overflow-hidden">
                          <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <div className="pl-6 flex flex-col items-start justify-center">
                        <div className="flex text-[var(--color-accent)]">
                          {[1, 2, 3, 4].map(i => <Star key={i} size={12} fill="currentColor" />)}
                          <Star size={12} fill="currentColor" className="clip-path-half" />
                        </div>
                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Trusted by 10,000+ People</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Guarantee Section */}
              <div className="bg-white p-10 md:p-16 rounded-[3rem] md:rounded-[4rem] border-4 border-[var(--color-accent)] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/10 rounded-full -mr-16 -mt-16" />
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-lg">
                    <ShieldCheck size={48} className="md:w-16 md:h-16" />
                  </div>
                  <div className="text-center md:text-left space-y-4">
                    <h3 className="text-2xl md:text-4xl font-serif font-bold text-[var(--color-text)]">
                      {language === 'english' ? 'The "Empty Plate" Guarantee' : '"காலி தட்டு" உத்தரவாதம்'}
                    </h3>
                    <p className="text-lg md:text-xl text-[var(--color-muted)] leading-relaxed italic">
                      {language === 'english' 
                        ? '"If you follow the plan for 7 days and don\'t feel lighter or more energetic, just send us a WhatsApp message. We will refund your ₹20 instantly, no questions asked, and you can keep the plan anyway."' 
                        : '"நீங்கள் 7 நாட்களுக்குத் திட்டத்தைப் பின்பற்றி, லேசாகவோ அல்லது அதிக சுறுசுறுப்பாகவோ உணரவில்லை என்றால், எங்களுக்கு ஒரு வாட்ஸ்அப் செய்தியை அனுப்புங்கள். உங்கள் ₹20-ஐ நாங்கள் உடனடியாகத் திருப்பித் தருவோம், எந்தக் கேள்வியும் கேட்கப்படாது, மேலும் நீங்கள் திட்டத்தை வைத்துக்கொள்ளலாம்."'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { title: language === 'english' ? 'Traditional Wisdom' : 'பாரம்பரிய ஞானம்', desc: language === 'english' ? 'Based on time-tested nutritional principles that have worked for generations.' : 'தலைமுறைகளாக வேலை செய்த காலத்தால் சோதிக்கப்பட்ட ஊட்டச்சத்து கொள்கைகளின் அடிப்படையில்.', icon: <Leaf /> },
                  { title: language === 'english' ? 'Practical Plans' : 'நடைமுறை திட்டங்கள்', desc: language === 'english' ? 'Plans use ingredients easily available in your local markets.' : 'உங்கள் உள்ளூர் சந்தைகளில் எளிதாகக் கிடைக்கும் பொருட்களைப் பயன்படுத்துகிறது.', icon: <MapPin /> },
                  { title: language === 'english' ? 'Scientific Accuracy' : 'அறிவியல் துல்லியம்', desc: language === 'english' ? 'AI-calculated macros tailored to your age, weight, and activity level.' : 'உங்கள் வயது, எடை மற்றும் செயல்பாட்டு நிலைக்கு ஏற்ப AI-கணக்கிடப்பட்ட மேக்ரோக்கள்.', icon: <Zap /> }
                ].map((f, i) => (
                  <div key={i} className="bg-white p-10 rounded-[3rem] border border-[var(--color-primary)]/5 shadow-xl hover:shadow-2xl transition-all group">
                    <div className="w-14 h-14 bg-[var(--color-bg)] rounded-2xl flex items-center justify-center text-[var(--color-primary)] mb-6 group-hover:scale-110 transition-transform">
                      {f.icon}
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[var(--color-text)] mb-3">{f.title}</h3>
                    <p className="text-[var(--color-muted)] leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>

              {/* Success Stories Section */}
              <div className="space-y-16 py-12">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-bold text-[10px] uppercase tracking-widest">
                    <Heart size={14} fill="currentColor" /> Real Results from Real People
                  </div>
                  <h3 className="text-3xl md:text-6xl font-serif font-bold text-[var(--color-text)]">
                    {language === 'english' ? 'Success Stories' : 'வெற்றிக் கதைகள்'}
                  </h3>
                  <p className="text-[var(--color-muted)] text-lg max-w-2xl mx-auto">
                    {language === 'english' 
                      ? 'Join thousands of people who have transformed their health using our authentic Tamil nutrition plans.' 
                      : 'எங்கள் உண்மையான தமிழ் ஊட்டச்சத்து திட்டங்களைப் பயன்படுத்தி தங்கள் ஆரோக்கியத்தை மாற்றியமைத்த ஆயிரக்கணக்கான மக்களுடன் சேருங்கள்.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { 
                      name: 'Senthil Kumar', 
                      role: 'Software Engineer', 
                      result: 'Lost 8kg in 30 Days', 
                      quote: 'I never thought I could lose weight while eating my favorite Tamil foods. The personalized plan made it so easy!',
                      img: 'https://picsum.photos/seed/success1/400/400'
                    },
                    { 
                      name: 'Priya Dharshini', 
                      role: 'Homemaker', 
                      result: 'Reversed Pre-Diabetes', 
                      quote: 'The traditional wisdom combined with modern nutrition data is a game changer. My energy levels are at an all-time high.',
                      img: 'https://picsum.photos/seed/success2/400/400'
                    },
                    { 
                      name: 'Rajesh V.', 
                      role: 'Fitness Enthusiast', 
                      result: 'Gained 4kg Muscle', 
                      quote: 'Authentic Tamil non-veg plans are hard to find. Suvai Sangam gave me exactly what I needed for my muscle gain journey.',
                      img: 'https://picsum.photos/seed/success3/400/400'
                    }
                  ].map((story, i) => (
                    <div key={i} className="bg-white p-8 rounded-[3rem] border border-[var(--color-primary)]/5 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-accent)]/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform" />
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                          <img src={story.img} alt={story.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-lg">{story.name}</h4>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">{story.role}</p>
                        </div>
                      </div>
                      <div className="inline-block px-4 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                        {story.result}
                      </div>
                      <p className="text-[var(--color-text)] font-medium italic leading-relaxed">
                        "{story.quote}"
                      </p>
                      <div className="flex text-[var(--color-accent)] mt-6">
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill="currentColor" />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Traditional Wisdom Ticker */}
              <div className="w-full overflow-hidden bg-[var(--color-primary)]/5 py-4 rounded-3xl border border-[var(--color-primary)]/10">
                <motion.div 
                  animate={{ x: [0, -1000] }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="flex whitespace-nowrap gap-12 items-center"
                >
                  {[
                    "உணவே மருந்து, மருந்தே உணவு (Food is medicine, medicine is food)",
                    "பசித்துப் புசி (Eat only when hungry)",
                    "அளவுக்கு மிஞ்சினால் அமிர்தமும் நஞ்சு (Even nectar is poison in excess)",
                    "நீரின்றி அமையாது உலகு (The world cannot exist without water)",
                    "உணவே மருந்து, மருந்தே உணவு (Food is medicine, medicine is food)",
                    "பசித்துப் புசி (Eat only when hungry)",
                    "அளவுக்கு மிஞ்சினால் அமிர்தமும் நஞ்சு (Even nectar is poison in excess)",
                    "நீரின்றி அமையாது உலகு (The world cannot exist without water)"
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Star size={14} className="text-[var(--color-accent)]" />
                      <span className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-widest">{text}</span>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Quick Stats / Aesthetic Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Traditional Wisdom', val: '2000+ Yrs', icon: <Clock size={24} />, color: 'bg-orange-50' },
                  { label: 'Personalized Plans', val: 'AI Driven', icon: <Zap size={24} />, color: 'bg-green-50' },
                  { label: 'Health Focused', val: '100% Natural', icon: <Heart size={24} />, color: 'bg-red-50' },
                ].map((stat, i) => (
                  <div key={i} className={`${stat.color} p-8 rounded-[2.5rem] border border-black/5 flex items-center gap-6 group hover:scale-[1.02] transition-all`}>
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[var(--color-primary)] shadow-sm group-hover:rotate-6 transition-transform">
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">{stat.label}</p>
                      <p className="text-2xl font-serif font-bold text-[var(--color-text)]">{stat.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback Section */}
              <div className="bg-[var(--color-bg)] p-8 md:p-16 rounded-[4rem] border border-[var(--color-primary)]/10 text-center space-y-8">
                <div className="max-w-2xl mx-auto space-y-4">
                  <h3 className="text-2xl md:text-4xl font-serif font-bold text-[var(--color-text)]">
                    {language === 'english' ? 'Your Feedback Matters' : 'உங்கள் கருத்து எங்களுக்கு முக்கியம்'}
                  </h3>
                  <p className="text-[var(--color-muted)] font-medium">
                    {language === 'english' 
                      ? 'Help us improve Suvai Sangam. Share your thoughts or rate your experience (Optional).' 
                      : 'சுவை சங்கத்தை மேம்படுத்த எங்களுக்கு உதவுங்கள். உங்கள் கருத்துக்களைப் பகிர்ந்து கொள்ளுங்கள் (விருப்பமானது).'}
                  </p>
                </div>
                
                <div className="max-w-xl mx-auto bg-white p-6 md:p-10 rounded-[3rem] shadow-xl border border-[var(--color-primary)]/5 space-y-6">
                  {feedbackSubmitted ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-10 space-y-4"
                    >
                      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
                        <CheckCircle size={48} />
                      </div>
                      <h4 className="text-xl font-serif font-bold text-[var(--color-text)]">Thank You!</h4>
                      <p className="text-[var(--color-muted)]">Your feedback helps us grow.</p>
                      <button 
                        onClick={() => setFeedbackSubmitted(false)}
                        className="text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest"
                      >
                        Send another
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <div className="flex justify-center gap-3">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star} 
                            onClick={() => setFeedbackRating(star)}
                            className={`${feedbackRating >= star ? 'text-[var(--color-accent)]' : 'text-gray-300'} hover:text-[var(--color-accent)] transition-colors`}
                          >
                            <Star size={32} fill={feedbackRating >= star ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={language === 'english' ? 'Share your suggestions...' : 'உங்கள் பரிந்துரைகளைப் பகிரவும்...'}
                        className="w-full bg-[var(--color-bg)] border border-[var(--color-primary)]/10 rounded-2xl p-4 h-32 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                      />
                      <button 
                        onClick={saveFeedback}
                        disabled={feedbackRating === 0}
                        className="suvai-btn w-full !rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {language === 'english' ? 'Submit Feedback' : 'கருத்தைச் சமர்ப்பிக்கவும்'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Features Section */}
              <div className="space-y-16 py-12">
                <div className="text-center space-y-4">
                  <h3 className="text-3xl md:text-6xl font-serif font-bold">Why Suvai Sangam?</h3>
                  <div className="w-24 h-1.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] mx-auto rounded-full" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { title: 'Authentic Tamil', desc: 'Recipes passed down through generations, adapted for modern fitness goals.', icon: <Utensils /> },
                    { title: 'Budget Friendly', desc: 'Nutrition that doesn\'t break the bank. We use local, affordable ingredients.', icon: <Wallet /> },
                    { title: 'Health First', icon: <Heart />, desc: 'Focused on long-term wellness, not just quick fixes. Rooted in Aru Suvai.' },
                    { title: 'AI Powered', icon: <Zap />, desc: 'Modern data science meets ancient wisdom for 100% personalization.' }
                  ].map((feat, i) => (
                    <div key={i} className="bg-white p-10 rounded-[3rem] border border-[var(--color-primary)]/5 shadow-sm hover:shadow-xl transition-all group">
                      <div className="w-16 h-16 bg-[var(--color-bg)] rounded-2xl flex items-center justify-center text-[var(--color-primary)] mb-6 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
                        {feat.icon}
                      </div>
                      <h4 className="text-xl font-serif font-bold mb-3">{feat.title}</h4>
                      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Section */}
              <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-leaf-dark)] p-12 md:p-20 rounded-[4rem] text-white text-center space-y-8">
                <h3 className="text-3xl md:text-5xl font-serif font-bold">Trusted by Thousands Across Tamil Nadu</h3>
                <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-80">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl md:text-5xl font-black">10k+</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Active Users</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl md:text-5xl font-black">4.8/5</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">User Rating</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl md:text-5xl font-black">100%</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Authentic</span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1-bmi"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-widest">
                  <Star size={14} /> Step 1 of 6
                </div>
                <h2 className="text-3xl md:text-6xl font-serif font-bold text-[var(--color-text)] leading-tight">
                  {language === 'english' ? 'Health Check' : 'உடல்நலப் பரிசோதனை'}
                </h2>
                <p className="text-[var(--color-muted)] text-lg max-w-2xl mx-auto">
                  {language === 'english' ? 'Enter your basic details to calculate your BMI and nutritional needs.' : 'உங்கள் பிஎம்ஐ மற்றும் ஊட்டச்சத்து தேவைகளைக் கணக்கிட உங்கள் அடிப்படை விவரங்களை உள்ளிடவும்.'}
                </p>
              </div>

              <div className="w-full max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-[3rem] border border-[var(--color-primary)]/10 shadow-2xl space-y-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] ml-2">Age (வயது)</label>
                    <input 
                      type="number" 
                      value={profile.age || ''}
                      onChange={(e) => setProfile({...profile, age: e.target.value === '' ? '' as any : Number(e.target.value)})}
                      placeholder="0"
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-primary)]/5 rounded-2xl px-5 py-4 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] ml-2">Gender (பாலினம்)</label>
                    <select 
                      value={profile.gender}
                      onChange={(e) => setProfile({...profile, gender: e.target.value as any})}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-primary)]/5 rounded-2xl px-5 py-4 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all appearance-none"
                    >
                      <option value="male">Male (ஆண்)</option>
                      <option value="female">Female (பெண்)</option>
                      <option value="other">Other (மற்றவை)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] ml-2">Weight (kg)</label>
                    <input 
                      type="number" 
                      value={profile.weight || ''}
                      onChange={(e) => setProfile({...profile, weight: e.target.value === '' ? '' as any : Number(e.target.value)})}
                      placeholder="0"
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-primary)]/5 rounded-2xl px-5 py-4 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] ml-2">Height (cm)</label>
                    <input 
                      type="number" 
                      value={profile.height || ''}
                      onChange={(e) => setProfile({...profile, height: e.target.value === '' ? '' as any : Number(e.target.value)})}
                      placeholder="0"
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-primary)]/5 rounded-2xl px-5 py-4 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all" 
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 bg-[var(--color-bg)] rounded-[2.5rem] border border-[var(--color-primary)]/5">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-white shadow-xl">
                      <Zap size={28} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Your Current BMI</p>
                      <p className="text-4xl font-serif font-bold text-[var(--color-primary)]">
                        {profile.weight && profile.height ? (profile.weight / ((profile.height/100) * (profile.height/100))).toFixed(1) : '0.0'}
                      </p>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Category (வகை)</p>
                    <p className="text-2xl font-bold text-[var(--color-accent)]">
                      {(() => {
                        if (!profile.weight || !profile.height) return 'Enter details above';
                        const bmi = profile.weight / ((profile.height/100) * (profile.height/100));
                        if (bmi < 18.5) return 'Underweight (குறைந்த எடை)';
                        if (bmi < 25) return 'Normal (சாதாரண எடை)';
                        if (bmi < 30) return 'Overweight (அதிக எடை)';
                        return 'Obese (உடல் பருமன்)';
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4 border-t border-[var(--color-primary)]/10">
                  <button onClick={handleBack} className="suvai-btn-outline w-full sm:w-auto px-10 py-4">
                    {language === 'english' ? TRANSLATIONS.back.english : TRANSLATIONS.back.tamil}
                  </button>
                  <button 
                    onClick={() => {
                      if (!profile.age || !profile.weight || !profile.height) {
                        toast.error("Please enter your age, weight, and height to continue.");
                        return;
                      }
                      handleNext();
                    }} 
                    className="suvai-btn w-full sm:w-auto px-12 py-4"
                  >
                    {language === 'english' ? TRANSLATIONS.nextStep.english : TRANSLATIONS.nextStep.tamil} <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-8 md:space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-widest">
                  <Star size={14} /> {language === 'english' ? TRANSLATIONS.step.english : TRANSLATIONS.step.tamil} 2 {language === 'english' ? TRANSLATIONS.of.english : TRANSLATIONS.of.tamil} 6
                </div>
                <h2 className="text-3xl md:text-6xl font-serif font-bold text-[var(--color-text)] leading-tight">
                  {language === 'english' ? TRANSLATIONS.selectGoal.english : TRANSLATIONS.selectGoal.tamil}
                </h2>
                <p className="text-[var(--color-muted)] text-base md:text-lg max-w-2xl mx-auto">
                  {language === 'english' ? TRANSLATIONS.whatGoal.english : TRANSLATIONS.whatGoal.tamil}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {GOALS.map(goal => (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`p-8 rounded-[3rem] transition-all flex flex-col items-center gap-6 text-center border-2 shadow-sm group ${
                      profile.goals.includes(goal.id) 
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xl scale-[1.02]' 
                        : 'bg-white border-transparent hover:border-[var(--color-primary)]/20 hover:bg-[var(--color-muted)]/5'
                    }`}
                  >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-md transition-transform group-hover:rotate-12 ${profile.goals.includes(goal.id) ? 'bg-white/20' : 'bg-[var(--color-bg)]'}`}>
                      {goal.icon}
                    </div>
                    <span className="font-serif font-bold text-xl">{goal.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4 border-t border-[var(--color-primary)]/10">
                <button onClick={handleBack} className="suvai-btn-outline w-full sm:w-auto px-10 py-4">
                  {language === 'english' ? TRANSLATIONS.back.english : TRANSLATIONS.back.tamil}
                </button>
                <button 
                  onClick={() => {
                    if (profile.goals.length === 0) {
                      toast.error("Please select at least one goal to continue.");
                      return;
                    }
                    handleNext();
                  }} 
                  className="suvai-btn w-full sm:w-auto px-12 py-4"
                >
                  {language === 'english' ? TRANSLATIONS.nextStep.english : TRANSLATIONS.nextStep.tamil} <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-8 md:space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-widest">
                  <Zap size={14} /> {language === 'english' ? TRANSLATIONS.step.english : TRANSLATIONS.step.tamil} 3 {language === 'english' ? TRANSLATIONS.of.english : TRANSLATIONS.of.tamil} 6
                </div>
                <h2 className="text-3xl md:text-6xl font-serif font-bold text-[var(--color-text)] leading-tight">
                  {language === 'english' ? TRANSLATIONS.activityFocus.english : TRANSLATIONS.activityFocus.tamil}
                </h2>
                <p className="text-[var(--color-muted)] text-base md:text-lg max-w-2xl mx-auto">
                  {language === 'english' ? TRANSLATIONS.howActive.english : TRANSLATIONS.howActive.tamil}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-4">
                    {ACTIVITY_LEVELS.map(level => (
                      <button
                        key={level.id}
                        onClick={() => selectActivity(level.id)}
                        className={`p-5 md:p-6 rounded-[2rem] transition-all flex items-center gap-4 md:gap-6 text-left border-2 shadow-sm ${
                          profile.activityLevel === level.id 
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xl scale-[1.02]' 
                            : 'bg-white border-transparent hover:border-[var(--color-primary)]/20 hover:bg-[var(--color-muted)]/5'
                        }`}
                      >
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-xl md:text-2xl ${profile.activityLevel === level.id ? 'bg-white/20' : 'bg-[var(--color-bg)]'}`}>
                          {level.icon}
                        </div>
                        <div>
                          <p className="font-bold text-base md:text-lg">{level.label}</p>
                          <p className={`text-xs md:text-sm ${profile.activityLevel === level.id ? 'text-white/80' : 'text-[var(--color-muted)]'}`}>{level.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-6">
                    <h3 className="label-title text-xl md:text-2xl">ஆரோக்கிய கவனம் <span className="label-subtitle inline ml-2">Health Focus</span></h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                      {HEALTH_FOCUS.map(focus => (
                        <button
                          key={focus.id}
                          onClick={() => toggleHealthFocus(focus.id)}
                          className={`p-4 md:p-6 rounded-[2rem] transition-all flex flex-col items-center gap-3 md:gap-4 text-center border-2 shadow-sm ${
                            profile.healthFocus.includes(focus.id) 
                              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xl scale-[1.02]' 
                              : 'bg-white border-transparent hover:border-[var(--color-primary)]/20 hover:bg-[var(--color-muted)]/5'
                          }`}
                        >
                          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-2xl md:text-3xl ${profile.healthFocus.includes(focus.id) ? 'bg-white/20' : 'bg-[var(--color-bg)]'}`}>
                            {focus.icon}
                          </div>
                          <span className="font-bold text-[8px] md:text-[10px] uppercase tracking-wider leading-tight">{focus.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8 lg:sticky lg:top-32">
                  <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-[var(--color-primary)]/5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full -mr-16 -mt-16" />
                    <div className="flex items-center gap-4 md:gap-6 mb-6">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-[var(--color-primary)]/10 rounded-3xl flex items-center justify-center text-[var(--color-primary)]">
                        <Star size={24} className="md:w-8 md:h-8" fill="currentColor" />
                      </div>
                      <h4 className="text-xl md:text-2xl font-serif font-bold">Did you know?</h4>
                    </div>
                    <p className="text-base md:text-lg text-[var(--color-muted)] leading-relaxed italic">
                      Traditional Tamil meals are designed to include all six tastes (Aru Suvai) to ensure a balanced mind and body.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4 border-t border-[var(--color-primary)]/10">
                <button onClick={handleBack} className="suvai-btn-outline w-full sm:w-auto px-10 py-4">
                  {language === 'english' ? TRANSLATIONS.back.english : TRANSLATIONS.back.tamil}
                </button>
                <button onClick={handleNext} className="suvai-btn w-full sm:w-auto px-12 py-4">
                  {language === 'english' ? TRANSLATIONS.nextStep.english : TRANSLATIONS.nextStep.tamil} <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-8 md:space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold text-[10px] uppercase tracking-widest">
                  <Leaf size={14} /> {language === 'english' ? TRANSLATIONS.step.english : TRANSLATIONS.step.tamil} 4 {language === 'english' ? TRANSLATIONS.of.english : TRANSLATIONS.of.tamil} 6
                </div>
                <h2 className="text-3xl md:text-6xl font-serif font-bold text-[var(--color-text)] leading-tight">
                  {language === 'english' ? TRANSLATIONS.dietaryChoices.english : TRANSLATIONS.dietaryChoices.tamil}
                </h2>
                <p className="text-[var(--color-muted)] text-base md:text-lg max-w-2xl mx-auto">
                  {language === 'english' ? TRANSLATIONS.selectPreference.english : TRANSLATIONS.selectPreference.tamil}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {DIET_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => toggleDietType(type.id)}
                      className={`p-6 md:p-8 rounded-[3rem] transition-all flex flex-col items-center gap-4 md:gap-6 text-center group border-2 shadow-sm ${
                        profile.dietType.includes(type.id) 
                          ? 'bg-[var(--color-accent)]/20 border-[var(--color-accent)] shadow-xl scale-[1.02]' 
                          : 'bg-white border-transparent hover:border-[var(--color-accent)]/20 hover:bg-[var(--color-muted)]/5'
                      }`}
                    >
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center text-3xl md:text-4xl shadow-md group-hover:rotate-12 transition-transform border border-[var(--color-accent)]/10">
                        {type.icon}
                      </div>
                      <span className="font-serif font-bold text-lg md:text-xl text-[var(--color-text)]">{type.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-8 lg:sticky lg:top-32">
                  <div className="bg-[var(--color-accent)]/10 p-8 md:p-10 rounded-[3rem] border border-[var(--color-accent)]/20 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/10 rounded-full -mr-16 -mt-16" />
                    <div className="flex items-center gap-4 md:gap-6 mb-6">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-[var(--color-accent)]/20 rounded-3xl flex items-center justify-center text-[var(--color-accent)]">
                        <Utensils size={24} className="md:w-8 md:h-8" />
                      </div>
                      <h4 className="text-xl md:text-2xl font-serif font-bold">The Six Tastes</h4>
                    </div>
                    <p className="text-base md:text-lg text-[var(--color-muted)] leading-relaxed italic">
                      "அறுசுவை" (Aru Suvai) - The six tastes: Sweet, Sour, Salty, Bitter, Pungent, and Astringent. A balanced meal should include all.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4 border-t border-[var(--color-primary)]/10">
                <button onClick={handleBack} className="suvai-btn-outline w-full sm:w-auto px-10 py-4">
                  {language === 'english' ? TRANSLATIONS.back.english : TRANSLATIONS.back.tamil}
                </button>
                <button onClick={handleNext} className="suvai-btn w-full sm:w-auto px-12 py-4">
                  {language === 'english' ? TRANSLATIONS.nextStep.english : TRANSLATIONS.nextStep.tamil} <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-8 md:space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-widest">
                  <Star size={14} /> {language === 'english' ? TRANSLATIONS.step.english : TRANSLATIONS.step.tamil} 5 {language === 'english' ? TRANSLATIONS.of.english : TRANSLATIONS.of.tamil} 6
                </div>
                <h2 className="text-3xl md:text-6xl font-serif font-bold text-[var(--color-text)] leading-tight">
                  {language === 'english' ? TRANSLATIONS.budgetStaples.english : TRANSLATIONS.budgetStaples.tamil}
                </h2>
                <p className="text-[var(--color-muted)] text-base md:text-lg max-w-2xl mx-auto">
                  {language === 'english' ? TRANSLATIONS.affordItems.english : TRANSLATIONS.affordItems.tamil}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
                <div className="suvai-card shadow-2xl overflow-hidden border border-[var(--color-primary)]/10 !rounded-[3rem]">
                  <div className="p-8 md:p-12 bg-[var(--color-primary)] text-white flex flex-col sm:flex-row items-center justify-between relative overflow-hidden gap-6">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-2xl" />
                    <div className="flex items-center gap-6 relative">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-3xl flex items-center justify-center text-[var(--color-accent)]">
                        <Zap size={24} className="md:w-8 md:h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-3xl font-serif font-bold">Budget-Friendly</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Tailored to your pocket</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--color-primary)]/5">
                    {profile.affordability?.filter(item => {
                      const isNonVeg = ['Egg', 'Chicken', 'Fish', 'Mutton', 'Biryani'].some(nv => item.item.includes(nv));
                      const isVegSelected = profile.dietType.includes('veg') || profile.dietType.includes('vegan');
                      if (isVegSelected && isNonVeg) return false;
                      return true;
                    }).map((item, idx) => (
                      <div key={idx} className="p-6 md:p-8 flex flex-col gap-4 md:gap-6 hover:bg-[var(--color-bg)] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-[var(--color-primary)] ${item.item.includes('Biryani') ? 'bg-orange-100' : 'bg-[var(--color-primary)]/10'}`}>
                            {item.item.includes('Biryani') ? '🥘' : <Utensils size={18} />}
                          </div>
                          <span className="font-bold text-lg md:text-xl text-[var(--color-text)]">{item.item}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['daily', 'weekly', 'rarely', 'never'].map(freq => (
                            <button
                              key={freq}
                              onClick={() => updateAffordability(item.item, freq)}
                              className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl text-[8px] md:text-[10px] font-bold uppercase tracking-widest transition-all border-2 ${
                                item.frequency === freq
                                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg scale-105'
                                  : 'bg-white text-[var(--color-muted)] border-[var(--color-primary)]/10 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                              }`}
                            >
                              {freq}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="p-8 md:p-10 bg-[var(--color-bg)] flex flex-col lg:flex-row gap-4 md:gap-6 items-center border-t-4 border-[var(--color-primary)]/10">
                      <div className="flex-1 w-full relative">
                        <input 
                          type="text" 
                          placeholder="Add other food (e.g. Almonds)" 
                          value={customItem}
                          onChange={e => setCustomItem(e.target.value)}
                          className="suvai-input pr-12 text-base md:text-lg !rounded-2xl"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
                          <Utensils size={20} className="md:w-6 md:h-6" />
                        </div>
                      </div>
                      <button 
                        onClick={addCustomItem}
                        className="w-full lg:w-auto suvai-btn !rounded-2xl !px-10 md:!px-12"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 lg:sticky lg:top-32">
                  <div className="bg-[var(--color-primary)]/5 p-8 md:p-10 rounded-[3rem] border border-[var(--color-primary)]/10 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full -mr-16 -mt-16" />
                    <div className="flex items-center gap-4 md:gap-6 mb-6">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-[var(--color-primary)]/10 rounded-3xl flex items-center justify-center text-[var(--color-primary)]">
                        <Zap size={24} className="md:w-8 md:h-8" />
                      </div>
                      <h4 className="text-xl md:text-2xl font-serif font-bold">Ancient Wisdom</h4>
                    </div>
                    <p className="text-base md:text-lg text-[var(--color-muted)] leading-relaxed italic">
                      "பசி வந்திடப் பத்தும் பறந்து போகும்" - When hunger comes, all ten virtues will fly away. We help you stay satisfied and healthy.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4 border-t border-[var(--color-primary)]/10">
                <button onClick={() => setStep(4)} className="suvai-btn-outline w-full sm:w-auto px-10 py-4">
                  <ChevronLeft size={20} /> {language === 'english' ? TRANSLATIONS.back.english : TRANSLATIONS.back.tamil}
                </button>
                <button 
                  onClick={generatePlan}
                  disabled={loading}
                  className="suvai-btn px-10 md:px-16 py-4 md:py-6 text-xl md:text-2xl shadow-xl disabled:opacity-50 w-full sm:w-auto"
                >
                  {loading ? (language === 'english' ? 'Cooking...' : 'தயாரிக்கப்படுகிறது...') : (language === 'english' ? TRANSLATIONS.generatePlan.english : TRANSLATIONS.generatePlan.tamil)} <ArrowRight size={28} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 6 && plan && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 md:space-y-12"
            >
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center justify-between mb-8 md:mb-12 bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-[var(--color-primary)]/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] via-[var(--color-deep-orange)] to-[var(--color-royal-blue)]" />
                <div className="space-y-2 md:space-y-3 text-center md:text-left">
                  <h2 className="text-3xl md:text-6xl font-serif font-black text-[var(--color-text)] tracking-tight">
                    <FormattedText text={plan.planName} language={language} />
                  </h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                    <p className="text-base md:text-xl text-[var(--color-muted)] font-bold">
                      {language === 'english' ? `Personalized ${profile.duration}-Day Tamil Diet Plan` : `தனிப்பயனாக்கப்பட்ட ${profile.duration}-நாள் தமிழ் உணவுத் திட்டம்`}
                    </p>
                    <div className="px-4 py-1 bg-[var(--color-accent)]/20 text-[var(--color-deep-orange)] rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest border border-[var(--color-accent)]/30">
                      Premium Heritage
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                  {paid && (
                    <div className="flex gap-3">
                      <button 
                        onClick={downloadPDF}
                        className="suvai-btn !rounded-2xl shadow-lg no-pdf !px-4 md:!px-6 !py-3 md:!py-4"
                        data-html2canvas-ignore="true"
                      >
                        <Download size={18} className="md:w-5 md:h-5" /> <span className="text-sm md:text-base">{language === 'english' ? TRANSLATIONS.downloadPdf.english : TRANSLATIONS.downloadPdf.tamil}</span>
                      </button>
                      <button 
                        onClick={() => window.print()}
                        className="suvai-btn-outline !rounded-2xl hidden md:flex no-pdf !px-6 !py-4"
                        data-html2canvas-ignore="true"
                      >
                        <Utensils size={20} /> Print
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => { setStep(0); setPlan(null); setPaid(false); setPaymentStep(false); }}
                    className="suvai-btn-outline !rounded-2xl !border-gray-200 !text-gray-500 hover:!bg-gray-50 !px-4 md:!px-6 !py-3 md:!py-4"
                  >
                    <RefreshCw size={18} className="md:w-5 md:h-5" /> <span className="text-sm md:text-base">New Plan</span>
                  </button>
                </div>
              </div>

              <div id="meal-plan-content" className="space-y-10 md:space-y-16 bg-white p-4 md:p-16 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border border-[var(--color-primary)]/5">
                {/* Meal Plan Header */}
                <div className="pdf-header w-full py-12 md:py-20 px-6 md:px-10 rounded-[2rem] md:rounded-[3.5rem] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-leaf-dark)] shadow-2xl mb-8 md:mb-12 border-4 md:border-8 border-white/20 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M0 0 L100 100 M100 0 L0 100" stroke="white" strokeWidth="0.5" />
                    </svg>
                  </div>
                  <div className="relative z-10 text-center space-y-4 md:space-y-6">
                    <h2 className="text-3xl md:text-7xl font-serif font-bold text-white leading-tight">
                      {language === 'english' ? 'Your Suvai Sangam Plan' : 'உங்கள் சுவை சங்கம் திட்டம்'}
                    </h2>
                    <div className="flex flex-col items-center gap-4">
                      <div className="px-6 py-2 bg-[var(--color-accent)] text-[var(--color-text)] rounded-full text-sm md:text-xl font-bold uppercase tracking-widest shadow-lg">
                        {selectedPlan === '7-day' ? '7-Day Heritage Plan' : '30-Day Premium Plan'}
                      </div>
                      <div className="flex items-center justify-center gap-4 md:gap-6 text-white/90">
                        <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-1.5 md:py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/20">
                          <Zap size={16} className="text-[var(--color-accent)] md:w-5 md:h-5" />
                          <span className="font-bold uppercase tracking-widest text-[10px] md:text-xs">{language === 'english' ? 'Scientifically Verified' : 'அறிவியல் ரீதியாக சரிபார்க்கப்பட்டது'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Summary for PDF */}
                {paid && (
                  <div className="pdf-profile-summary bg-[var(--color-bg)] p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-[var(--color-primary)]/10 space-y-8">
                    <div className="flex items-center justify-between border-b border-[var(--color-primary)]/10 pb-6">
                      <h3 className="text-2xl md:text-4xl font-serif font-bold text-[var(--color-primary)]">Profile Summary</h3>
                      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-[var(--color-primary)]/10 shadow-sm">
                        <Info size={16} className="text-[var(--color-primary)]" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">BMI: {(profile.weight / ((profile.height/100) * (profile.height/100))).toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
                      {[
                        { label: 'Age', val: `${profile.age} Years` },
                        { label: 'Gender', val: profile.gender },
                        { label: 'Weight', val: `${profile.weight} kg` },
                        { label: 'Height', val: `${profile.height} cm` },
                        { label: 'Activity', val: profile.activityLevel },
                        { label: 'Diet', val: profile.dietType.join(', ') },
                        { label: 'Goals', val: profile.goals.join(', ') },
                        { label: 'Health Focus', val: profile.healthFocus.join(', ') },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">{item.label}</p>
                          <p className="font-bold text-sm md:text-lg text-[var(--color-text)] capitalize">{item.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Preview Mode */}
              {!paid && !paymentStep && (
                <div className="space-y-8 md:space-y-12">
                  <div className="text-center space-y-3 md:space-y-4">
                    <div className="flex justify-center gap-4 mb-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold border border-green-100">
                        <ShieldCheck size={14} /> {language === 'english' ? TRANSLATIONS.doctorVerified.english : TRANSLATIONS.doctorVerified.tamil}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-100">
                        <Star size={14} /> 4.9/5 User Rating
                      </div>
                    </div>
                    <span className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest">Free Sample Preview</span>
                    <h3 className="text-xl md:text-3xl font-serif font-bold text-[var(--color-text)]">
                      {language === 'english' ? 'Your Personalized 7-Day Health Guide Preview' : 'உங்கள் தனிப்பயனாக்கப்பட்ட 7-நாள் ஆரோக்கிய வழிகாட்டி முன்னோட்டம்'}
                    </h3>
                  </div>

                  {/* Sample Day 1 - Only Breakfast and Mid-Morning */}
                  <div className="max-w-6xl mx-auto space-y-6">
                    <div className="text-center">
                      <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Sample Day 1 Preview</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {plan.days?.slice(0, 3).map((day: any, idx: number) => (
                        <DayCard key={idx} day={day} profile={profile} language={language as string} index={idx} isPreview={true} />
                      ))}
                    </div>
                  </div>

                  {/* Payment Options Below Sample */}
                  <div className="max-w-4xl mx-auto bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border border-[var(--color-primary)]/10 shadow-2xl space-y-8 md:space-y-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 md:h-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]" />
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                      <div className="w-20 h-20 md:w-28 md:h-28 bg-[var(--color-primary)]/5 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-[var(--color-primary)] shrink-0">
                        <Star size={40} className="md:w-16 md:h-16" fill="currentColor" />
                      </div>
                      <div className="text-center md:text-left space-y-2">
                        <h4 className="text-2xl md:text-4xl font-serif font-bold text-[var(--color-text)]">Unlock Your Full Ayurvedic Health Guide</h4>
                        <p className="text-sm md:text-lg text-[var(--color-muted)]">
                          {language === 'english' 
                            ? 'Get the complete 7-day personalized guide with accurate nutritional data, traditional Tamil health tips, and Ayurvedic wisdom.' 
                            : 'துல்லியமான ஊட்டச்சத்து தரவு, பாரம்பரிய தமிழ் ஆரோக்கிய குறிப்புகள் மற்றும் ஆயுர்வேத ஞானத்துடன் முழுமையான 7-நாள் வழிகாட்டியைப் பெறுங்கள்.'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="w-full max-w-md space-y-6">
                        <button 
                          onClick={() => handlePayment('trial')}
                          className="bg-white border-2 md:border-4 border-[var(--color-primary)] p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] text-left hover:bg-[var(--color-primary)]/5 transition-all group relative overflow-hidden shadow-xl w-full"
                        >
                          <div className="absolute top-4 right-4 bg-[var(--color-accent)] text-[var(--color-text)] text-[8px] md:text-[10px] font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest animate-pulse">Only 100 spots left!</div>
                          <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] mb-1">7-Day Ayurvedic Health Guide</p>
                          <h4 className="text-xl md:text-2xl font-serif font-bold text-[var(--color-text)]">Full Heritage Prescription</h4>
                          <div className="flex items-center gap-3 mt-2 md:mt-4">
                            <p className="text-lg md:text-xl text-gray-400 line-through">₹199</p>
                            <p className="text-2xl md:text-4xl font-bold text-[var(--color-primary)]">₹20</p>
                          </div>
                          <p className="text-[10px] text-[var(--color-muted)] mt-2 font-medium italic">Join 10,000+ happy users today.</p>
                        </button>

                        <div className="flex flex-col gap-3">
                          <a 
                            href="https://wa.me/919999999999?text=I%20need%20help%20with%20my%20Suvai%20Sangam%20Diet%20Plan" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-3 p-4 bg-[#25D366]/10 text-[#25D366] rounded-2xl border border-[#25D366]/20 font-bold text-sm hover:bg-[#25D366]/20 transition-all"
                          >
                            <Mail size={18} /> {language === 'english' ? TRANSLATIONS.whatsappSupport.english : TRANSLATIONS.whatsappSupport.tamil}
                          </a>
                        </div>

                        <div className="bg-[var(--color-bg)] p-6 rounded-3xl border border-[var(--color-primary)]/5 space-y-4">
                          <h5 className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">What's Included:</h5>
                          <ul className="space-y-2">
                            {[
                              language === 'english' ? '7-Day Personalized Health Prescription' : '7-நாள் தனிப்பயனாக்கப்பட்ட ஆரோக்கிய பரிந்துரை',
                              language === 'english' ? 'Bilingual (Tamil + English) Support' : 'இருமொழி (தமிழ் + ஆங்கிலம்) ஆதரவு',
                              language === 'english' ? 'Accurate Macro & Calorie Data' : 'துல்லியமான மேக்ரோ & கலோரி தரவு',
                              language === 'english' ? 'Traditional Ayurvedic Health Tips' : 'பாரம்பரிய ஆயுர்வேத ஆரோக்கிய குறிப்புகள்',
                              language === 'english' ? 'Chennai-Specific Food Alternatives' : 'சென்னை பிரத்யேக உணவு மாற்றுகள்',
                              language === 'english' ? 'Downloadable Health Guide (PDF)' : 'பதிவிறக்கம் செய்யக்கூடிய ஆரோக்கிய வழிகாட்டி (PDF)'
                            ].map((item, i) => (
                              <li key={i} className="flex items-center gap-2 text-[10px] font-medium text-[var(--color-text)]">
                                <Check size={12} className="text-green-500" /> {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex flex-col items-center text-center gap-2">
                            <ShieldCheck size={24} className="text-green-600" />
                            <p className="text-[8px] font-bold uppercase tracking-widest text-green-700">7-Day Money Back Guarantee</p>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col items-center text-center gap-2">
                            <CheckCircle size={24} className="text-blue-600" />
                            <p className="text-[8px] font-bold uppercase tracking-widest text-blue-700">Nutritionist Verified Plan</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 md:gap-4 text-[10px] md:text-xs text-[var(--color-muted)] font-bold uppercase tracking-widest pt-4 border-t border-gray-50">
                      <Zap size={14} className="text-[var(--color-primary)] md:w-4 md:h-4" />
                      <span>Instant Access • Secure UPI • PDF Download</span>
                    </div>
                  </div>

                  <div className="relative mt-12 md:mt-20 opacity-20 grayscale blur-md pointer-events-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                      {plan.days?.slice(1, 4).map((day: any, idx: number) => (
                        <div key={idx} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] space-y-4 md:space-y-6 border border-gray-100">
                          <div className="h-6 md:h-8 bg-gray-100 rounded-full w-1/2" />
                          <div className="space-y-3 md:space-y-4">
                            <div className="h-3 md:h-4 bg-gray-50 rounded w-3/4" />
                            <div className="h-3 md:h-4 bg-gray-50 rounded w-1/2" />
                            <div className="h-3 md:h-4 bg-gray-50 rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Step */}
              {paymentStep && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 md:p-16 rounded-[2.5rem] md:rounded-[4rem] border border-[var(--color-primary)]/10 shadow-2xl space-y-8 md:space-y-10 max-w-lg mx-auto relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 md:w-48 h-32 md:h-48 bg-[var(--color-primary)]/5 rounded-full -mr-16 md:-mr-24 -mt-16 md:-mt-24" />
                  <div className="flex justify-between items-center border-b border-[var(--color-primary)]/5 pb-6 md:pb-8">
                    <div className="space-y-1">
                      <h3 className="text-2xl md:text-3xl font-serif font-bold text-[var(--color-text)]">Secure Checkout</h3>
                      <p className="text-xs md:text-sm text-[var(--color-muted)] font-medium">Safe & Encrypted Payment</p>
                    </div>
                    <button onClick={() => setPaymentStep(false)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gray-50 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
                      <ChevronLeft size={20} className="md:w-6 md:h-6" />
                    </button>
                  </div>

                  <div className="space-y-6 md:space-y-8">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-accent)]/20 text-[var(--color-primary)] rounded-full text-[10px] font-bold uppercase tracking-widest border border-[var(--color-accent)]/30">
                        <Zap size={14} /> {language === 'english' ? 'Limited Time Beta Price' : 'குறைந்த நேர பீட்டா விலை'}
                      </div>
                      <h3 className="text-2xl md:text-4xl font-serif font-bold text-[var(--color-text)]">Choose Your Transformation</h3>
                      <p className="text-sm text-[var(--color-muted)] font-medium italic">
                        {language === 'english' ? 'Less than the cost of a Vada-Sambar at a local tea shop.' : 'உள்ளூர் தேநீர் கடையில் வடை-சாம்பார் சாப்பிடும் விலையை விட குறைவு.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { 
                          id: 'trial', 
                          name: 'The Trial', 
                          taName: 'சோதனைத் திட்டம்',
                          price: 20, 
                          original: 199,
                          desc: '7-Day Personalized Plan', 
                          taDesc: '7-நாள் தனிப்பயனாக்கப்பட்ட திட்டம்',
                          features: ['7-Day Plan', 'Bilingual Support', 'Macro Data'],
                          badge: 'Cheapest'
                        },
                        { 
                          id: 'accelerator', 
                          name: 'The Accelerator', 
                          taName: 'வேகமான மாற்றம்',
                          price: 99, 
                          original: 499,
                          desc: '7-Day Plan + 3 Bonuses + Support', 
                          taDesc: '7-நாள் திட்டம் + 3 போனஸ்கள் + ஆதரவு',
                          features: ['Everything in Trial', '3 Strategy Bonuses', 'WhatsApp Support'],
                          badge: 'Best Value',
                          popular: true
                        },
                        { 
                          id: 'vip', 
                          name: 'The VIP', 
                          taName: 'விஐபி திட்டம்',
                          price: 499, 
                          original: 1999,
                          desc: '30-Day Plan + Personal Coaching', 
                          taDesc: '30-நாள் திட்டம் + தனிப்பட்ட பயிற்சி',
                          features: ['30-Day Full Plan', 'Personal Macro Calc', 'Priority Support'],
                          badge: 'Ultimate'
                        }
                      ].map((tier) => (
                        <button
                          key={tier.id}
                          onClick={() => setSelectedTier(tier.id as any)}
                          className={`relative p-6 rounded-[2rem] border-2 transition-all text-left flex items-center justify-between gap-4 ${
                            selectedTier === tier.id 
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg scale-[1.02]' 
                              : 'border-gray-100 bg-white hover:border-[var(--color-primary)]/30'
                          }`}
                        >
                          {tier.popular && (
                            <div className="absolute top-0 right-10 -translate-y-1/2 bg-[var(--color-primary)] text-white text-[8px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                              Most Popular
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-serif font-bold text-[var(--color-text)]">
                                {language === 'english' ? tier.name : tier.taName}
                              </h4>
                              <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-muted)] bg-gray-100 px-2 py-0.5 rounded-full">{tier.badge}</span>
                            </div>
                            <p className="text-xs text-[var(--color-muted)] font-medium">
                              {language === 'english' ? tier.desc : tier.taDesc}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-400 line-through">₹{tier.original}</p>
                            <p className="text-2xl font-black text-[var(--color-primary)]">₹{tier.price}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="p-6 md:p-8 bg-[var(--color-bg)] rounded-[1.5rem] md:rounded-[2.5rem] space-y-3 md:space-y-4 border border-[var(--color-primary)]/5">
                      <div className="flex justify-between text-lg md:text-xl">
                        <span className="text-[var(--color-muted)] font-medium">Selected: {selectedTier.toUpperCase()}</span>
                        <div className="text-right">
                          <span className="font-bold text-[var(--color-text)]">₹{selectedTier === 'trial' ? '20' : selectedTier === 'accelerator' ? '99' : '499'}.00</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs md:text-sm text-[var(--color-muted)]">
                        <span>GST (Included)</span>
                        <span>₹0.00</span>
                      </div>
                      <div className="border-t border-[var(--color-primary)]/10 pt-4 md:pt-6 flex justify-between text-2xl md:text-3xl font-bold">
                        <span className="text-[var(--color-text)]">Total</span>
                        <span className="text-[var(--color-primary)]">₹{selectedTier === 'trial' ? '20' : selectedTier === 'accelerator' ? '99' : '499'}.00</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button 
                      onClick={confirmPayment}
                      className="w-full suvai-btn !rounded-[1.5rem] md:!rounded-[2rem] !py-4 md:!py-6 !text-base md:!text-lg shadow-xl group"
                    >
                      <CreditCard size={20} className="md:w-6 md:h-6" /> 
                      <span>{language === 'english' ? 'Pay with UPI / QR' : 'UPI / QR மூலம் பணம் செலுத்துங்கள்'}</span>
                      <ArrowRight className="group-hover:translate-x-2 transition-transform md:w-5 md:h-5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 md:gap-3 text-[10px] md:text-xs text-[var(--color-muted)] font-bold uppercase tracking-widest">
                    <CheckCircle size={16} className="text-[var(--color-primary)] md:w-4.5 md:h-4.5" />
                    <span>SSL Secured • Razorpay</span>
                  </div>
                </motion.div>
              )}

              {/* Full Plan View */}
              {paid && (
                <div className="space-y-10 md:space-y-16">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                    <h2 className="text-2xl md:text-5xl font-serif font-bold text-[var(--color-text)] tracking-tighter text-center md:text-left">Your Personalized Plan</h2>
                    <div className="px-4 py-1.5 md:py-2 bg-[var(--color-bg)] rounded-full border border-[var(--color-primary)]/10">
                      <p className="text-[8px] md:text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest">Bilingual: Tamil + English</p>
                    </div>
                  </div>

                  {/* Nutrition Summary */}
                  {(selectedTier === 'accelerator' || selectedTier === 'vip') && (
                    <BonusesSection language={language} />
                  )}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
                    {[
                      { label: 'Avg Calories', val: '1850 kcal', icon: <Flame size={16} className="md:w-4.5 md:h-4.5" /> },
                      { label: 'Health Focus', val: profile.healthFocus.length > 0 ? profile.healthFocus[0] : 'General', icon: <Info size={16} className="md:w-4.5 md:h-4.5" /> },
                      { label: 'Protein Focus', val: 'High', icon: <Zap size={16} className="md:w-4.5 md:h-4.5" /> },
                      { label: 'Diet Type', val: profile.dietType.join(', '), icon: <Utensils size={16} className="md:w-4.5 md:h-4.5" /> },
                      { label: 'Duration', val: `${plan.days.length} Days`, icon: <Clock size={16} className="md:w-4.5 md:h-4.5" /> },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-[var(--color-primary)]/10 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-[var(--color-bg)] rounded-xl flex items-center justify-center text-[var(--color-primary)] mb-2 md:mb-3">
                          {stat.icon}
                        </div>
                        <p className="text-[8px] md:text-[10px] font-bold uppercase text-[var(--color-muted)] tracking-widest">{stat.label}</p>
                        <p className="font-bold text-xs md:text-base text-[var(--color-text)] capitalize truncate w-full">{stat.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-8 md:space-y-12">
                    {/* 7-Day Plan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                      {plan.days?.map((day: any, idx: number) => (
                        <DayCard key={idx} day={day} profile={profile} language={language as string} index={idx} />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
                    <div className="pdf-section pdf-grocery-list bg-[var(--color-leaf-dark)] text-white p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] space-y-6 md:space-y-10 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-white/5 rounded-full -mr-24 md:-mr-32 -mt-24 md:-mt-32" />
                      <div className="flex items-center gap-3 md:gap-4 relative">
                        <div className="w-10 h-10 md:w-16 md:h-16 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[var(--color-accent)]">
                          <ShoppingCart size={20} className="md:w-8 md:h-8" />
                        </div>
                        <h3 className="text-xl md:text-4xl font-serif font-bold">Grocery List</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6 relative">
                        {plan.groceryList?.map((item: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/10 border border-white/10 group hover:bg-white/20 transition-all">
                            <div className="w-4 h-4 md:w-6 md:h-6 rounded-md md:rounded-lg border-2 border-white/20 flex-shrink-0 mt-0.5 group-hover:border-[var(--color-accent)] transition-colors" />
                            <div className="font-bold text-xs md:text-base">
                              <FormattedText text={item} language={language} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pdf-section pdf-tips-section bg-[var(--color-accent)] p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] space-y-6 md:space-y-10 shadow-xl relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 w-48 md:w-64 h-48 md:h-64 bg-black/5 rounded-full -ml-24 md:-ml-32 -mb-24 md:-mb-32" />
                      <div className="flex items-center gap-3 md:gap-4 relative">
                        <div className="w-10 h-10 md:w-16 md:h-16 bg-black/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[var(--color-text)]">
                          <Info size={20} className="md:w-8 md:h-8" />
                        </div>
                        <h3 className="text-xl md:text-4xl font-serif font-bold text-[var(--color-text)]">Health Tips</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 relative">
                        {plan.tips?.map((tip: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 md:gap-6 bg-white/40 p-4 md:p-6 rounded-xl md:rounded-3xl border border-white/20">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center flex-shrink-0 font-bold shadow-lg text-xs md:text-base">
                              {i + 1}
                            </div>
                            <div className="text-[var(--color-text)] font-bold italic leading-relaxed text-xs md:text-base">
                              <FormattedText text={tip} language={language} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Suggestions Section */}
                  {plan.aiSuggestions && (
                    <div className="pdf-section bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-[var(--color-primary)]/10 shadow-xl relative overflow-hidden">
                      <div className="absolute -top-16 md:-top-24 -right-16 md:-right-24 w-48 md:w-64 h-48 md:h-64 bg-[var(--color-bg)] rounded-full opacity-20" />
                      <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mb-6 md:mb-10 relative text-center sm:text-left">
                        <div className="w-10 h-10 md:w-16 md:h-16 bg-[var(--color-primary)] rounded-xl md:rounded-2xl flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
                          <Zap size={20} className="md:w-8 md:h-8" />
                        </div>
                        <div>
                          <h3 className="text-xl md:text-4xl font-serif font-bold text-[var(--color-text)]">AI Smart Suggestions</h3>
                          <p className="text-[var(--color-muted)] font-bold text-xs md:text-base">Personalized habits & lifestyle hacks</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 relative">
                        {plan.aiSuggestions?.map((suggestion: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-[var(--color-bg)] rounded-xl md:rounded-3xl border border-[var(--color-primary)]/5">
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-white flex items-center justify-center text-[var(--color-primary)] shadow-sm flex-shrink-0">
                              <Star size={12} fill="currentColor" className="md:w-4 md:h-4" />
                            </div>
                            <div className="text-[var(--color-text)] font-medium leading-relaxed text-xs md:text-base">
                              <FormattedText text={suggestion} language={language} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center gap-4 py-8 md:py-12 no-pdf" data-html2canvas-ignore="true">
                    <button 
                      onClick={downloadPDF}
                      className="suvai-btn px-6 md:px-8 py-3 md:py-4 text-base md:text-lg shadow-xl flex items-center gap-3"
                    >
                      <Download size={18} className="md:w-5 md:h-5" /> 
                      <span>{language === 'english' ? TRANSLATIONS.downloadPdf.english : TRANSLATIONS.downloadPdf.tamil}</span>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-black">BMI: {(profile.weight / ((profile.height/100) * (profile.height/100))).toFixed(1)}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back to Top Button */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: 20 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-8 right-8 flex flex-col items-center justify-center gap-1 z-[90] group no-pdf"
              data-html2canvas-ignore="true"
            >
              <div className="w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform border-2 border-white/20">
                <ArrowUp size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">Top</span>
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-8 md:p-20 bg-white text-[var(--color-text)] border-t border-[var(--color-primary)]/5 relative overflow-hidden no-pdf" data-html2canvas-ignore="true">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)]/10 to-transparent" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-leaf-dark)] rounded-lg flex items-center justify-center text-white">
                <Utensils size={18} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Suvai Sangam</h2>
            </div>
            <p className="text-base text-[var(--color-muted)] max-w-md leading-relaxed">
              Empowering Tamil Nadu with personalized, affordable, and authentic nutrition plans. 
              <span className="block italic mt-2">தமிழ் உணவியல் உங்கள் ஆரோக்கியத்திற்கு.</span>
            </p>
            <div className="flex gap-4">
              {[Heart, RefreshCw, Star].map((Icon, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-primary)] cursor-pointer hover:bg-[var(--color-primary)] hover:text-white transition-all">
                  <Icon size={18} />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="font-bold uppercase tracking-[0.2em] text-[10px] text-[var(--color-muted)]">Quick Links</h3>
            <ul className="space-y-4 text-sm font-bold">
              {['Home', 'Features', 'Pricing', 'Contact'].map((item) => (
                <li key={item}>
                  <a href={`#${item.toLowerCase()}`} className="text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-6">
            <h3 className="font-bold uppercase tracking-[0.2em] text-[10px] text-[var(--color-muted)]">Contact Us</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li className="flex items-center gap-3 text-[var(--color-muted)]">
                <MapPin size={18} className="text-[var(--color-primary)]" />
                <span>Chennai, Tamil Nadu</span>
              </li>
              <li className="flex items-center gap-3 text-[var(--color-muted)]">
                <Mail size={18} className="text-[var(--color-primary)]" />
                <span>hello@suvaisangam.com</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-[var(--color-primary)]/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
          <p>© 2024 Suvai Sangam. All rights reserved.</p>
          <div className="flex gap-8">
            <span className="cursor-pointer hover:text-[var(--color-primary)] transition-colors">Privacy Policy</span>
            <span className="cursor-pointer hover:text-[var(--color-primary)] transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>

      {/* Payment Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-[var(--color-primary)] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-[var(--color-accent)]"
          >
            <div className="w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-[var(--color-text)]">
              <Check size={20} strokeWidth={4} />
            </div>
            <div>
              <p className="font-bold text-sm uppercase tracking-widest">Payment Successful!</p>
              <p className="text-[10px] opacity-60">செலுத்துதல் வெற்றிகரமாக முடிந்தது</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--color-primary)]/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative mb-12">
              <div className="w-32 h-32 md:w-48 md:h-48 border-4 border-white/10 rounded-full animate-[spin_10s_linear_infinite]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="text-white"
                >
                  <Utensils size={64} className="md:w-24 md:h-24" />
                </motion.div>
              </div>
              <div className="absolute inset-0 border-t-4 border-[var(--color-accent)] rounded-full animate-spin" />
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-lg"
            >
              <h3 className="text-2xl md:text-4xl font-serif font-bold text-white">
                {loadingType === 'pdf' 
                  ? (language === 'english' ? 'Generating Your PDF...' : 'உங்கள் PDF-ஐ உருவாக்குகிறோம்...')
                  : (language === 'english' ? 'Crafting Your Personalized Plan...' : 'உங்கள் தனிப்பயனாக்கப்பட்ட திட்டத்தை உருவாக்குகிறோம்...')}
              </h3>
              
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-xl min-h-[160px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentFactIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <p className="text-[var(--color-accent)] text-[10px] font-bold uppercase tracking-[0.3em]">
                      {language === 'english' ? 'Did You Know?' : 'உங்களுக்குத் தெரியுமா?'}
                    </p>
                    <p className="text-white text-lg md:text-xl font-medium leading-relaxed">
                      {TAMIL_FOOD_FACTS[currentFactIndex].ta}
                    </p>
                    <p className="text-white/60 text-sm italic">
                      {TAMIL_FOOD_FACTS[currentFactIndex].en}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <p className="text-white/50 text-sm font-medium">
                {loadingStatus}
              </p>
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    className="w-3 h-3 bg-[var(--color-accent)] rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </ErrorBoundary>
  );
}
