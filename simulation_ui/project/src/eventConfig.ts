// Event configuration with custom reactions
// Each event can have either an emoji or a PNG image as reaction

export interface EventDefinition {
  name: string;
  description: string;
  probability: number;
  causesSplit?: boolean;
  reactionType: 'emoji' | 'image';
  reactionContent: string; // emoji character or path to image
}

// Configure your events here!
// For emoji reactions: use the emoji character directly
// For image reactions: put your PNG files in the project folder and reference them
export const EVENT_DEFINITIONS: EventDefinition[] = [
  {
    name: "nothing",
    description: "Normal year without special events",
    probability: 0.40,
    reactionType: 'emoji',
    reactionContent: '😐'
  },
  {
    name: "income_increase",
    description: "Salary increase 2-6%",
    probability: 0.75,
    reactionType: 'emoji',
    reactionContent: '💰'
  },
  {
    name: "promotion",
    description: "Promotion with 10-20% salary jump",
    probability: 0.12,
    reactionType: 'emoji',
    reactionContent: '🎉'
  },
  {
    name: "bonus",
    description: "Year-end bonus received",
    probability: 0.50,
    reactionType: 'emoji',
    reactionContent: '💵'
  },
  {
    name: "layoff",
    description: "Job loss, 6 months unemployment",
    probability: 0.02,
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '😰'
  },
  {
    name: "new_job",
    description: "New job with +10% salary",
    probability: 0.18,
    reactionType: 'emoji',
    reactionContent: '🎊'
  },
  {
    name: "income_decrease",
    description: "Salary cut or short-time work",
    probability: 0.08,
    reactionType: 'emoji',
    reactionContent: '📉'
  },
  {
    name: "sickness",
    description: "Serious illness, 6-12 months reduced income",
    probability: 0.015,
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '🤒'
  },
  {
    name: "disability",
    description: "Occupational disability",
    probability: 0.008,
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '🏥'
  },
  {
    name: "divorce",
    description: "Divorce (peak years 6-10)",
    probability: 0.025,
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '💔'
  },
  {
    name: "inheritance",
    description: "Inheritance €50k-€200k",
    probability: 0.015,
    reactionType: 'emoji',
    reactionContent: '💎'
  },
  {
    name: "house_damage_minor",
    description: "Water damage/repair €5k-€15k",
    probability: 0.01,
    reactionType: 'emoji',
    reactionContent: '🔧'
  },
  {
    name: "house_damage_major",
    description: "Major damage €20k-€50k",
    probability: 0.002,
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '🏚️'
  },
  {
    name: "car_breakdown",
    description: "Car repair €1k-€5k",
    probability: 0.25,
    reactionType: 'emoji',
    reactionContent: '🚗'
  },
  {
    name: "marry",
    description: "Get married",
    probability: 0.06,
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '💍'
  },
  {
    name: "have_first_child",
    description: "Have first child",
    probability: 0.08,
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '👶'
  },
  {
    name: "have_second_child",
    description: "Have second child",
    probability: 0.20,
    reactionType: 'emoji',
    reactionContent: '👶👶'
  },
  {
    name: "have_third_child",
    description: "Have third child",
    probability: 0.10,
    reactionType: 'emoji',
    reactionContent: '👨‍👩‍👧‍👦'
  },
  {
    name: "make_extra_payment",
    description: "Extra mortgage payment €3k-€15k",
    probability: 0.30,
    reactionType: 'emoji',
    reactionContent: '🏦'
  },
  {
    name: "go_on_vacation",
    description: "Vacation €2k-€5k",
    probability: 0.60,
    reactionType: 'emoji',
    reactionContent: '✈️'
  },
  {
    name: "buy_second_car",
    description: "Buy second car",
    probability: 0.08,
    reactionType: 'emoji',
    reactionContent: '🚙'
  },
  {
    name: "renovate_house",
    description: "Major renovation €20k-€50k",
    probability: 0.10,
    reactionType: 'emoji',
    reactionContent: '🏗️'
  },
  {
    name: "change_career",
    description: "Career change/further education",
    probability: 0.05,
    reactionType: 'emoji',
    reactionContent: '📚'
  }
];

// Example of how to use a PNG image instead:
// {
//   name: "example_event",
//   description: "Example with custom image",
//   probability: 0.1,
//   reactionType: 'image',
//   reactionContent: 'custom_event.png'  // Put your PNG in the same folder as index.html
// }