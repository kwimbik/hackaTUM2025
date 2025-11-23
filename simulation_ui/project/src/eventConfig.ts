// Event configuration with custom reactions
// Each event can have either an emoji or a PNG image as reaction

import type { Branch } from './types.js';

export interface EventDefinition {
  name: string;
  description: string;
  causesSplit?: boolean;
  reactionType: 'emoji' | 'image';
  reactionContent: string; // emoji character or path to image
  modifyBranch?: (branch: Branch) => void; // Optional function to modify branch attributes
}

// Configure your events here!
// For emoji reactions: use the emoji character directly
// For image reactions: put your PNG files in the project folder and reference them
export const EVENT_DEFINITIONS: EventDefinition[] = [
  {
    name: "nothing",
    description: "Normal year without special events",
    reactionType: 'emoji',
    reactionContent: '😐'
  },
  {
    name: "income_increase",
    description: "Salary increase 2-6%",
    reactionType: 'emoji',
    reactionContent: '💰',
    modifyBranch: (branch) => {
      const increase = 1.02 + Math.random() * 0.04; // 2-6% increase
      branch.monthlyWage = Math.floor(branch.monthlyWage * increase);
    }
  },
  {
    name: "promotion",
    description: "Promotion with 10-20% salary jump",
    reactionType: 'emoji',
    reactionContent: '🎉',
    modifyBranch: (branch) => {
      const increase = 1.10 + Math.random() * 0.10; // 10-20% increase
      branch.monthlyWage = Math.floor(branch.monthlyWage * increase);
    }
  },
  {
    name: "bonus",
    description: "Year-end bonus received",
    reactionType: 'emoji',
    reactionContent: '💵',
    modifyBranch: (branch) => {
      const bonus = Math.floor(branch.monthlyWage * (0.5 + Math.random() * 1.5)); // 0.5-2 months salary
      branch.money += bonus;
    }
  },
  {
    name: "layoff",
    description: "Job loss, 6 months unemployment",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '😰',
    modifyBranch: (branch) => {
      branch.monthlyWage = Math.floor(branch.monthlyWage * 0.6); // Unemployment benefits ~60%
    }
  },
  {
    name: "new_job",
    description: "New job with +10% salary",
    reactionType: 'emoji',
    reactionContent: '🎊',
    modifyBranch: (branch) => {
      branch.monthlyWage = Math.floor(branch.monthlyWage * 1.10);
    }
  },
  {
    name: "income_decrease",
    description: "Salary cut or short-time work",
    reactionType: 'emoji',
    reactionContent: '📉',
    modifyBranch: (branch) => {
      const decrease = 0.85 + Math.random() * 0.10; // 5-15% decrease
      branch.monthlyWage = Math.floor(branch.monthlyWage * decrease);
    }
  },
  {
    name: "sickness",
    description: "Serious illness, 6-12 months reduced income",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '🤒',
    modifyBranch: (branch) => {
      branch.monthlyWage = Math.floor(branch.monthlyWage * 0.7); // Sick pay ~70%
    }
  },
  {
    name: "disability",
    description: "Occupational disability",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '🏥',
    modifyBranch: (branch) => {
      branch.monthlyWage = Math.floor(branch.monthlyWage * 0.5); // Disability benefits ~50%
    }
  },
  {
    name: "divorce",
    description: "Divorce (peak years 6-10)",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '💔',
    modifyBranch: (branch) => {
      branch.maritalStatus = "Divorced";
      branch.money = Math.floor(branch.money * 0.6); // Asset split
    }
  },
  {
    name: "inheritance",
    description: "Inheritance €50k-€200k",
    reactionType: 'emoji',
    reactionContent: '💎',
    modifyBranch: (branch) => {
      const inheritance = 50000 + Math.random() * 150000;
      branch.money += Math.floor(inheritance);
    }
  },
  {
    name: "house_damage_minor",
    description: "Water damage/repair €5k-€15k",
    reactionType: 'emoji',
    reactionContent: '🔧',
    modifyBranch: (branch) => {
      const cost = 5000 + Math.random() * 10000;
      branch.money -= Math.floor(cost);
    }
  },
  {
    name: "house_damage_major",
    description: "Major damage €20k-€50k",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '🏚️',
    modifyBranch: (branch) => {
      const cost = 20000 + Math.random() * 30000;
      branch.money -= Math.floor(cost);
    }
  },
  {
    name: "car_breakdown",
    description: "Car repair €1k-€5k",
    reactionType: 'emoji',
    reactionContent: '🚗',
    modifyBranch: (branch) => {
      const cost = 1000 + Math.random() * 4000;
      branch.money -= Math.floor(cost);
    }
  },
  {
    name: "marry",
    description: "Get married",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '💍',
    modifyBranch: (branch) => {
      branch.maritalStatus = "Married";
      branch.money -= 15000; // Wedding costs
    }
  },
  {
    name: "have_first_child",
    description: "Have first child",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '👶',
    modifyBranch: (branch) => {
      branch.childCount = 1;
    }
  },
  {
    name: "have_second_child",
    description: "Have second child",
    reactionType: 'emoji',
    reactionContent: '👶👶',
    modifyBranch: (branch) => {
      branch.childCount = 2;
    }
  },
  {
    name: "have_third_child",
    description: "Have third child",
    reactionType: 'emoji',
    reactionContent: '👨‍👩‍👧‍👦',
    modifyBranch: (branch) => {
      branch.childCount = 3;
    }
  },
  {
    name: "make_extra_payment",
    description: "Extra mortgage payment €3k-€15k",
    reactionType: 'emoji',
    reactionContent: '🏦',
    modifyBranch: (branch) => {
      const payment = 3000 + Math.random() * 12000;
      branch.money -= Math.floor(payment);
    }
  },
  {
    name: "go_on_vacation",
    description: "Vacation €2k-€5k",
    reactionType: 'emoji',
    reactionContent: '✈️',
    modifyBranch: (branch) => {
      const cost = 2000 + Math.random() * 3000;
      branch.money -= Math.floor(cost);
    }
  },
  {
    name: "buy_second_car",
    description: "Buy second car",
    reactionType: 'emoji',
    reactionContent: '🚙',
    modifyBranch: (branch) => {
      branch.money -= 15000; // Used car cost
    }
  },
  {
    name: "renovate_house",
    description: "Major renovation €20k-€50k",
    reactionType: 'emoji',
    reactionContent: '🏗️',
    modifyBranch: (branch) => {
      const cost = 20000 + Math.random() * 30000;
      branch.money -= Math.floor(cost);
    }
  },
  {
    name: "change_career",
    description: "Career change/further education",
    reactionType: 'emoji',
    reactionContent: '📚',
    modifyBranch: (branch) => {
      branch.money -= 10000; // Education costs
      branch.monthlyWage = Math.floor(branch.monthlyWage * 0.9); // Temporary income decrease
    }
  },
  {
    name: "graduate_masters",
    description: "Graduate from Master's degree",
    reactionType: 'emoji',
    reactionContent: '🎓'
  },
  {
    name: "first_job",
    description: "First professional job",
    reactionType: 'emoji',
    reactionContent: '💼'
  },
  {
    name: "interest_rate_change",
    description: "Market interest rates shift",
    reactionType: 'emoji',
    reactionContent: '📊'
  },
  {
    name: "get_loan",
    description: "Mortgage loan approved",
    reactionType: 'emoji',
    reactionContent: '🏦'
  },
  {
    name: "interest_rate_shock",
    description: "Rates jump 2%! Monthly payments 400€ higher",
    reactionType: 'emoji',
    reactionContent: '📈'
  },
  {
    name: "interest_rate_opportunity",
    description: "Historic low rates! 2.5% available",
    reactionType: 'emoji',
    reactionContent: '📉'
  },
  {
    name: "housing_boom",
    description: "Property prices surge 20%!",
    reactionType: 'emoji',
    reactionContent: '🏠'
  },
  {
    name: "housing_correction",
    description: "Market correction -15%",
    reactionType: 'emoji',
    reactionContent: '🏚️'
  },
  {
    name: "parents_gift",
    description: "Parents offer 40k€ for down payment",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '🎁',
    modifyBranch: (branch) => {
      branch.money += 40000;
    }
  },
  {
    name: "massive_sondertilgung",
    description: "Extra payment 20k€ - saves 5 years",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '💸',
    modifyBranch: (branch) => {
      branch.money -= 20000;
      branch.currentLoan = Math.max(0, branch.currentLoan - 20000);
    }
  },
  {
    name: "lifestyle_trap",
    description: "New BMW, luxury vacation - savings destroyed",
    causesSplit: true,
    reactionType: 'emoji',
    reactionContent: '🚗',
    modifyBranch: (branch) => {
      branch.money -= 30000;
    }
  },
  {
    name: "buy_disability_insurance",
    description: "Purchase occupational disability insurance",
    reactionType: 'emoji',
    reactionContent: '🛡️'
  },
  {
    name: "increase_payment_rate",
    description: "Increase repayment rate from 2% to 3-4%",
    reactionType: 'emoji',
    reactionContent: '⬆️'
  },
  {
    name: "decrease_payment_rate",
    description: "Decrease repayment rate (financial hardship)",
    reactionType: 'emoji',
    reactionContent: '⬇️'
  },
  {
    name: "minor_income",
    description: "Small positive income event (100-500€)",
    reactionType: 'emoji',
    reactionContent: '💵',
    modifyBranch: (branch) => {
      const income = 100 + Math.random() * 400;
      branch.money += Math.floor(income);
    }
  },
  {
    name: "minor_expense",
    description: "Small unexpected expense (100-500€)",
    reactionType: 'emoji',
    reactionContent: '💸',
    modifyBranch: (branch) => {
      const expense = 100 + Math.random() * 400;
      branch.money -= Math.floor(expense);
    }
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