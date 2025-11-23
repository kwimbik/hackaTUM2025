import type { GameEvent } from './types.js';

interface PopupInfo {
  branchId?: number;
  monthIndex?: number;
  description?: string;
  reactionContent?: string;
  apiData?: GameEvent['apiData'];
}

// Curated event copy; each event picks a random line so repeat events stay fresh.
const EVENT_LINES: Record<string, string[]> = {
  income_increase: [
    "Paycheck glow-up—somebody noticed the hustle.",
    "A quiet raise sneaks in. Your wallet smiles.",
    "Salary steps up a notch. Coffee's on you."
  ],
  promotion: [
    "New title unlocked. The ladder just got shorter.",
    "Promotion landed—fresh responsibilities, fresher pay.",
    "Badge leveled up. You run a tighter ship now."
  ],
  bonus: [
    "Surprise bonus drop. Rainy-day fund gets sunnier.",
    "Extra cash confetti just fell into the account.",
    "Year-end pat on the back—bank account applauds."
  ],
  layoff: [
    "Pink slip moment. Time to pivot the storyline.",
    "Job rug pulled—deep breath, new chapter loading.",
    "The role vanished. Hustle instincts kick in."
  ],
  new_job: [
    "Fresh gig, fresh paycheck. New desk smell included.",
    "Signed a new offer. Momentum stays undefeated.",
    "Swapped badges—career GPS rerouting upward."
  ],
  income_decrease: [
    "Pay took a dip. Budget goggles on.",
    "Salary trimmed. Time for lean creativity.",
    "A little belt-tightening enters the chat."
  ],
  sickness: [
    "Health pause—rest becomes the main quest.",
    "Recovery arc unlocked. Pace slows, spirit holds.",
    "Life hit the brakes; healing takes the wheel."
  ],
  disability: [
    "A hard pivot—adapting becomes the superpower.",
    "Disability detour. Systems get rebuilt with care.",
    "New constraints, new strategies. Resilience mode."
  ],
  divorce: [
    "Split paths. Assets and emotions reorganize.",
    "Uncoupling. The story branches in two.",
    "Divorce ink dries; finances reshape overnight."
  ],
  inheritance: [
    "Legacy lands in the account. A quiet windfall.",
    "Inheritance arrives—past meets present in cash form.",
    "Family gift drops in. Plans get taller."
  ],
  house_damage_minor: [
    "Leaky pipes demanded tribute. Wallet obliged.",
    "Water mischief—called the plumber, paid the fee.",
    "Minor house chaos fixed with a few thousand tears."
  ],
  house_damage_major: [
    "Major home hit. Insurance papers start flying.",
    "The house groaned loudly. Repairs roar back.",
    "Renovation emergency—big bills storm the door."
  ],
  car_breakdown: [
    "Car sulked on the roadside. Mechanic to the rescue.",
    "Engine drama. Savings play the hero.",
    "Breakdown blues: a tow, a bill, a story."
  ],
  marry: [
    "Rings exchanged. Love and expenses intertwined.",
    "Wedding bells and receipts both chimed.",
    "Marriage unlocked—a joyful, slightly pricey patch."
  ],
  have_first_child: [
    "A first tiny human arrives. Budget gets cuter.",
    "Parenthood unlocked—new gig, zero onboarding.",
    "First kid, first lullabies, first sleepless ledger."
  ],
  have_second_child: [
    "Kiddo number two joins the squad. Team chaos grows.",
    "Second child arrives—noise floor rises lovingly.",
    "Level two parenting achieved. More snacks required."
  ],
  have_third_child: [
    "Third kid: circus promoted to full festival.",
    "Big family energy unlocked. Logistics go pro.",
    "Child three enters—carpool math intensifies."
  ],
  make_extra_payment: [
    "Extra mortgage punch landed—debt wobbles.",
    "Threw cash at the principal. Interest takes a step back.",
    "Bonus payment made. Future self sends thanks."
  ],
  go_on_vacation: [
    "Bags packed. Memories loading; balance dipping.",
    "Vacation mode on—spent on sunsets and stories.",
    "Escaped the grind. Receipts smell like sunscreen."
  ],
  buy_second_car: [
    "Garage just got crowded. Convenience upgraded.",
    "Second set of wheels acquired—freedom expands.",
    "Another car rolls in. Budget feels the torque."
  ],
  renovate_house: [
    "Walls knocked down, dreams built up.",
    "Renovation dust everywhere—future cozy incoming.",
    "House leveling up. Bank account feeling the reps."
  ],
  change_career: [
    "Career compass spins—new path selected.",
    "Switched lanes. Learning hat firmly on.",
    "Career pivot engaged. Short-term dip, long-term plot twist."
  ],
  nothing: [
    "Quiet month—sometimes stable is the flex.",
    "No plot twist. Breathing room secured.",
    "Steady as she goes; calm bankroll waters."
  ]
};

const gradientPalette = [
  "linear-gradient(135deg, #f472b6, #6366f1)",
  "linear-gradient(135deg, #22d3ee, #4f46e5)",
  "linear-gradient(135deg, #fb923c, #ef4444)",
  "linear-gradient(135deg, #34d399, #10b981)",
  "linear-gradient(135deg, #c084fc, #60a5fa)"
];

const sizeBuckets = [
  { name: 'compact', min: 180, max: 220 },
  { name: 'regular', min: 200, max: 240 },
  { name: 'wide', min: 220, max: 260 }
];

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ensureLayer(): HTMLDivElement {
  let layer = document.getElementById("eventPopupLayer") as HTMLDivElement | null;
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "eventPopupLayer";
    layer.className = "event-popup-layer";
    document.body.appendChild(layer);
  }
  return layer;
}

function formatMonth(monthIndex?: number): string {
  if (monthIndex === undefined || Number.isNaN(monthIndex)) return "Timeline event";
  const startYear = 2025;
  const year = startYear + Math.floor(monthIndex / 12);
  const month = monthIndex % 12;
  return `${monthNames[month]} ${year}`;
}

function prettifyName(eventName: string): string {
  return eventName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function chooseLine(eventName: string, fallback: string): string {
  const lines = EVENT_LINES[eventName] ?? [];
  if (lines.length === 0) {
    return fallback;
  }
  return lines[Math.floor(Math.random() * lines.length)];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function showEventPopup(eventName: string, info: PopupInfo = {}) {
  const layer = ensureLayer();
  const popup = document.createElement("article");
  popup.className = "event-popup";

  const size = sizeBuckets[Math.floor(Math.random() * sizeBuckets.length)];
  const width = Math.floor(randomBetween(size.min, size.max));
  popup.classList.add(`event-popup--${size.name}`);
  popup.style.width = `${width}px`;

  const gradient = gradientPalette[Math.floor(Math.random() * gradientPalette.length)];
  popup.style.background = gradient;

  // Random position within layer bounds with a small gutter.
  const gutter = 16;
  const layerWidth = layer.clientWidth || window.innerWidth;
  const layerHeight = layer.clientHeight || window.innerHeight;
  const maxX = Math.max(gutter, layerWidth - width - gutter);
  const maxY = Math.max(gutter, layerHeight - 160);
  popup.style.left = `${randomBetween(gutter, maxX)}px`;
  popup.style.top = `${randomBetween(gutter, maxY)}px`;

  const title = prettifyName(eventName);
  const headline = chooseLine(eventName, info.description || `Event: ${title}`);

  const eyebrow = document.createElement("div");
  eyebrow.className = "event-popup__eyebrow";
  const branchLabel = info.branchId !== undefined ? `Branch #${info.branchId}` : "Branch ?";
  eyebrow.textContent = `${formatMonth(info.monthIndex)} • ${branchLabel}`;

  const heading = document.createElement("div");
  heading.className = "event-popup__title";
  heading.textContent = title;

  const body = document.createElement("p");
  body.className = "event-popup__body";
  body.textContent = headline;

  if (info.reactionContent) {
    const glyph = document.createElement("div");
    glyph.className = "event-popup__icon";
    glyph.textContent = info.reactionContent;
    popup.appendChild(glyph);
  }

  popup.appendChild(eyebrow);
  popup.appendChild(heading);
  popup.appendChild(body);
  layer.appendChild(popup);

  // Entrance animation
  requestAnimationFrame(() => popup.classList.add("event-popup--in"));

  // Schedule removal
  const lifetime = 3500 + Math.random() * 2000;
  setTimeout(() => {
    popup.classList.add("event-popup--out");
    setTimeout(() => popup.remove(), 600);
  }, lifetime);
}
