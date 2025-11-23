// Curated event copy; each event picks a random line so repeat events stay fresh.
const EVENT_LINES = {
    graduate_masters: [
        "Diploma secured! Average starting salary: 48k€. Mortgage capacity: ~200k€.",
        "Master's complete—your earning potential just jumped 20%. Banks love this.",
        "Academic finish line crossed. Next race: building that Eigenkapital."
    ],
    first_job: [
        "First paycheck incoming! Pro tip: Save 30% for Eigenkapital from day one.",
        "Career launched. In 3 years of smart saving, you could have your down payment.",
        "Real income unlocked. The mortgage clock starts ticking—every month of rent is equity lost."
    ],
    interest_rate_change: [
        "Market shift! Rates move for everyone—timing beats everything in mortgages.",
        "Interest rate shuffle—a 1% change means 50k€ difference over loan lifetime.",
        "Rate volatility strikes. Those locked in are sleeping well tonight."
    ],
    get_loan: [
        "Bank says YES! You're mortgage-qualified. The biggest financial decision of your life awaits.",
        "Green light from lenders! Remember: Just because you CAN borrow 400k€ doesn't mean you SHOULD.",
        "Loan approved—but wait, have you checked KfW programs? Could save you thousands."
    ],
    layoff: [
        "Job lost. This is why emergency funds matter—mortgage payments don't pause.",
        "Employment ended. Without 6 months buffer, homeownership dreams get derailed.",
        "Pink slip arrives. Those with mortgages and no safety net are sweating bullets."
    ],
    interest_rate_shock: [
        "RATE EXPLOSION! 2% jump = 400€ more monthly. Procrastinators just got priced out.",
        "Interest spike! A 300k€ mortgage now costs 80k€ more over lifetime. Ouch.",
        "Rates skyrocket! Those who waited for 'perfect timing' just learned an expensive lesson."
    ],
    interest_rate_opportunity: [
        "HISTORIC LOWS! Lock in now—this 2.5% rate is a once-in-decade gift.",
        "Rate paradise! Every 0.5% saved = 30k€ less interest. Time to strike.",
        "Golden window opens! At these rates, buying beats renting in year one."
    ],
    housing_boom: [
        "PRICES SURGE 20%! That 300k€ house is now 360k€. Waiting has a cost.",
        "Property explosion! Your Eigenkapital just lost massive buying power.",
        "Market goes vertical! Every month of hesitation = 5k€ more needed."
    ],
    housing_correction: [
        "MARKET DROPS 15%! Cash-ready buyers, this is your moment.",
        "Price correction! Those with Eigenkapital ready are about to win big.",
        "Buyer's market arrives! Panic sellers meet prepared buyers—guess who wins?"
    ],
    inheritance: [
        "Inheritance lands—50k€! Instant 20% down on a 250k€ home. Game-changer.",
        "Windfall arrives! This could eliminate PMI and secure best rates immediately.",
        "Life-changing money inherited. The mortgage timeline just shortened by 5 years."
    ],
    marry: [
        "Wedding bells! Dual income = double the mortgage power. 500k€ house now possible.",
        "Married! Two salaries, one dream. Banks love dual-income households.",
        "Partnership sealed! Combined finances unlock better rates and bigger homes."
    ],
    have_first_child: [
        "Baby arrives! Space needs increase, but income often decreases temporarily.",
        "First child! That 2-Zimmer suddenly feels tiny. Upgrade pressure begins.",
        "Parent mode activated! Mortgage planning now includes Kindergeld calculations."
    ],
    parents_gift: [
        "Parents step up with 40k€! Covers all Nebenkosten plus boosts down payment.",
        "Family assist! This gift just saved you 2 years of saving and unlocked better rates.",
        "Parental boost deployed! From 5% to 15% Eigenkapital instantly—rate drops 0.7%."
    ],
    massive_sondertilgung: [
        "MEGA PAYMENT! 20k€ extra crushes 5 years off mortgage. Freedom at 55, not 60.",
        "Sondertilgung deployed! This single payment saves 35k€ in interest.",
        "Bonus to mortgage! While others buy BMWs, you just bought 5 years of freedom."
    ],
    lifestyle_trap: [
        "Lifestyle inflation strikes! That BMW lease just delayed homeownership by 3 years.",
        "Consumption trap sprung! 30k€ on luxury = 100k€ less house you can afford.",
        "Keeping-up-with-Schmidts syndrome! Short-term flex, long-term mortgage regret."
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
let currentPopup = null;
function ensureLayer() {
    let layer = document.getElementById("eventPopupLayer");
    if (!layer) {
        layer = document.createElement("div");
        layer.id = "eventPopupLayer";
        layer.className = "event-popup-layer";
        document.body.appendChild(layer);
    }
    return layer;
}
function formatMonth(monthIndex) {
    if (monthIndex === undefined || Number.isNaN(monthIndex))
        return "Timeline event";
    const startYear = 2025;
    const year = startYear + Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    return `${monthNames[month]} ${year}`;
}
function prettifyName(eventName) {
    return eventName
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
function chooseLine(eventName, fallback) {
    var _a;
    const lines = (_a = EVENT_LINES[eventName]) !== null && _a !== void 0 ? _a : [];
    if (lines.length === 0) {
        return fallback;
    }
    return lines[Math.floor(Math.random() * lines.length)];
}
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}
export function showEventPopup(eventName, info = {}) {
    const layer = ensureLayer();
    // Remove existing popup if there is one
    if (currentPopup) {
        currentPopup.classList.add("event-popup--out");
        setTimeout(() => currentPopup === null || currentPopup === void 0 ? void 0 : currentPopup.remove(), 300);
        currentPopup = null;
    }
    const popup = document.createElement("article");
    popup.className = "event-popup";
    currentPopup = popup;
    const size = sizeBuckets[Math.floor(Math.random() * sizeBuckets.length)];
    const width = Math.floor(randomBetween(size.min, size.max));
    popup.classList.add(`event-popup--${size.name}`);
    popup.style.width = `${width}px`;
    const gradient = gradientPalette[Math.floor(Math.random() * gradientPalette.length)];
    popup.style.background = gradient;
    // Fixed position in top-left corner
    popup.style.left = `20px`;
    popup.style.top = `20px`;
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
