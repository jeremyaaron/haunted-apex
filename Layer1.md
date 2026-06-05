# Haunted Apex: The Game

## Layer 1 — The Shape of the Thing

At first, the project was misidentified.

It looked like a management sim.

Then it looked like a startup sim.

Then it looked like a UI-heavy cyberpunk strategy game.

But the deeper identity is this:

> **Haunted Apex is a procedural cyber-noir power simulator where the player builds an underworld network in a city that treats desire, debt, memory, violence, and influence as currencies.**

The game is not about “doing missions.”

It is about **pressure orchestration**.

You are not a soldier.
You are not a hacker.
You are not a chosen hero.
You are the person who decides who gets sent, who gets seduced, who gets paid, who gets burned, who gets remembered, and who disappears.

The player fantasy is:

> “I am building a beautiful, dangerous machine made of people.”

That is the core.

---

# The First Design Pillar: The UI Is the Throne

Haunted Apex is not a game where the UI is a necessary evil.

The UI is where the fantasy happens.

The player should feel like they are sitting inside a private intelligence system used by an underworld sovereign. The screens are not menus. They are instruments of power.

The dashboard is not a dashboard.

It is **the Black Ledger**.

The event feed is not a notification list.

It is **the city whispering through compromised channels**.

The character sheet is not a character sheet.

It is **a dossier**.

The map is not a map.

It is **territory, threat, rumor, and opportunity visualized as command surface**.

Every control should feel diegetic:

| Ordinary UI        | Haunted Apex equivalent                       |
| ------------------ | --------------------------------------------- |
| Button             | Commit order                                  |
| Dropdown           | Secure channel selector                       |
| Slider             | Risk appetite / influence allocation          |
| Modal              | Intercepted transmission / emergency briefing |
| Table              | Surveillance ledger / operative registry      |
| Checkbox           | Protocol toggle                               |
| Progress bar       | Operation instability / heat accumulation     |
| Toast notification | Encrypted alert                               |
| Settings           | Command environment preferences               |
| Save file          | Memory archive                                |

The interface should make the player feel like they have access to information they are not supposed to have.

---

# The World Is Procedural, But the Rules Are Canon

Haunted Apex does not need one canonical villain, one canonical nightclub, or one canonical romance.

It needs **canon generators**.

The canon is not:

> Sable runs the club.

The canon is:

> Every city has someone like Sable: a person who turns intimacy into infrastructure.

The canon is not:

> The Red Chapel is always the main venue.

The canon is:

> Every city has a place where nightlife, power, flesh, money, and memory become indistinguishable.

The canon is not:

> This corporation is always the enemy.

The canon is:

> Corporations in Haunted Apex do not merely sell products; they own pieces of human continuity.

So every campaign generates its own:

- city districts
- power venues
- rival masterminds
- corporations
- syndicates
- operatives
- liaisons
- betrayals
- secrets
- scandals
- debts
- ghosts

But all of it obeys Haunted Apex world-logic.

That gives replayability without turning the IP into generic cyberpunk soup.

---

# The Core Campaign

## Default Mode: Kingpin

The player begins as a minor but promising operator in a procedurally generated city-sector.

They have:

- one safehouse
- a little money
- two or three operatives
- one useful contact
- one unresolved debt
- one rival who barely knows they exist
- one opportunity too good to ignore

The goal is not merely to survive.

The goal is to ascend.

The main score is:

```ts
type CoreScore = {
  dominion: number; // how much of the city bends around you
  continuity: number; // how stable your network is
  legend: number; // how memorable/feared/desired your name becomes
};
```

The public-facing goal could be:

> **Control the Apex before the city consumes you.**

But “control” should be flexible. There are multiple victory philosophies.

## Victory Styles

### 1. Dominion Victory

You control enough districts, factions, and infrastructure that the city effectively answers to you.

Fantasy:

> “Every door opens because people know better than to keep it closed.”

### 2. Black Ledger Victory

You own enough secrets, debts, kompromat, and memory-fragments that no visible throne is required.

Fantasy:

> “No one knows you rule the city. That is why you rule it.”

### 3. Ghost Victory

You become myth, signal, rumor, and fear. Your physical network may be small, but your legend destabilizes everyone else.

Fantasy:

> “They are no longer sure whether you are a person.”

### 4. Corpse Crown Victory

You destroy or absorb all major rivals through war, sabotage, seduction, or betrayal.

Fantasy:

> “The city kneels because all alternatives are dead.”

### 5. Exit Victory

You make enough money, power, and leverage to vanish beyond the city’s reach.

Fantasy:

> “You won because you escaped.”

This lets the player define what kind of monster, monarch, or myth they became.

---

# The Core Pressures

At Layer 1, do not create 37 metrics. Start with five.

```ts
type Pressures = {
  dominion: number;
  heat: number;
  loyalty: number;
  resources: number;
  intel: number;
};
```

But each of these is not just a number. Each is a pressure family.

## Dominion

Your power.

Represents:

- district control
- fear
- influence
- reputation
- economic capture
- social leverage
- rival respect

High Dominion unlocks better operations, stronger recruitment, and access to elite circles.

But high Dominion attracts danger.

Dominion is never free.

## Heat

How visible and threatened you are.

Represents:

- law enforcement attention
- corporate security interest
- rival awareness
- media exposure
- internal leaks
- supernatural/haunting attention, depending on campaign settings

Heat is the primary “you are becoming too loud” meter.

At high Heat:

- operations become riskier
- safehouses can be compromised
- liaisons become nervous
- rivals coordinate
- corp security escalates
- betrayal probability rises

## Loyalty

Whether your people remain yours.

Represents:

- operative morale
- belief in leadership
- fear/respect balance
- internal cohesion
- emotional attachment
- debt to the player
- ideological alignment

Low Loyalty creates:

- desertion
- betrayal
- failed operations
- informants
- messy romance consequences
- rival poaching

High Loyalty allows dangerous operations and long-term stability.

But loyalty can be built through love, fear, money, ideology, shared trauma, or mutual blackmail.

Each has different consequences.

## Resources

Money and useful material capacity.

Represents:

- credits
- contraband
- safehouses
- gear
- bribe funds
- legal cover
- front businesses
- medical access

Resources are the obvious fuel.

But a rich network with weak loyalty is just a vault waiting to be robbed.

## Intel

What you know that others do not.

Represents:

- secrets
- surveillance access
- blackmail
- faction intentions
- corporate vulnerabilities
- hidden relationships
- operative background
- prophecy/ghost data in more supernatural campaigns

Intel lets the player reduce uncertainty.

High Intel turns random events into managed risks.

Low Intel makes the city feel alive in a hostile way.

---

# The Hidden Pressure: Ruin

The first five pressures are visible.

But Haunted Apex should have at least one semi-hidden pressure:

```ts
type HiddenPressures = {
  ruin: number;
};
```

Ruin is the cost of becoming what the city rewards.

Ruin grows when the player:

- burns loyal people
- relies on torture or coercion
- breaks intimate trust
- overuses ghost-tech
- destroys neighborhoods
- lets operatives become disposable
- trades memory or identity as currency
- repeatedly chooses power over continuity

Ruin is not morality in a simple good/evil sense.

It is metaphysical corrosion.

At high Ruin:

- events become stranger
- loyal people become hollow
- dead characters may reappear as data echoes
- liaisons become obsessive or uncanny
- districts change tone
- certain victory paths open
- certain humane endings close

This gives Haunted Apex its “haunted” dimension.

Not every campaign needs overt supernatural content, but even in grounded mode, Ruin can represent psychological and social rot.

---

# The First Player Verbs

The player does not “click buildings.”

The player issues underworld commands.

At v0, the verbs are:

```ts
type CoreActionType =
  | "GATHER_INTEL"
  | "RUN_OPERATION"
  | "EXPAND_INFLUENCE"
  | "RECRUIT_OPERATIVE"
  | "MANAGE_RELATIONSHIP"
  | "REDUCE_HEAT"
  | "INVEST_FRONT"
  | "NEGOTIATE_WITH_FACTION"
  | "BURN_ASSET"
  | "ADVANCE_WEEK";
```

Each action moves pressures.

## Gather Intel

Reduces uncertainty.

Can reveal:

- faction plans
- rival weakness
- liaison secrets
- hidden police pressure
- district instability
- operation modifiers
- betrayal risks

Example:

```ts
const gatherIntel: ActionDefinition = {
  id: "gather_intel",
  label: "Gather Intel",
  cost: { resources: 500 },
  baseEffects: { intel: +8, heat: +1 },
  risks: [{ type: "counter_surveillance", chance: 0.08 }],
};
```

## Run Operation

The main mission verb.

Operations include:

- blackmail
- theft
- sabotage
- extraction
- seduction
- assassination
- data theft
- debt collection
- protection
- infiltration
- smuggling
- memory recovery

Operations require operatives and generate consequences.

## Expand Influence

Claim social, economic, or territorial control.

Raises Dominion but increases Heat and rival attention.

## Recruit Operative

Adds people to the machine.

Operatives are not generic units. They have wants, risks, secrets, and breaking points.

## Manage Relationship

Used for liaisons, allies, rivals, lovers, informants, patrons, and unstable assets.

Relationships are strategic objects.

Not dating-sim fluff. Not pure flavor.

A relationship can be:

- access
- danger
- healing
- debt
- compromise
- obsession
- camouflage
- weapon

## Reduce Heat

Lay low, bribe, misdirect, sacrifice asset, frame rival, clean evidence.

Heat reduction should often cost something unpleasant.

## Invest Front

Build legitimate or semi-legitimate businesses.

Examples:

- nightclub
- clinic
- logistics company
- security firm
- data brokerage
- art gallery
- luxury hotel floor
- courier network
- memory spa
- religious foundation

Fronts generate Resources, Influence, cover, and events.

## Negotiate with Faction

Creates treaties, debts, trades, ceasefires, betrayals, shared operations.

## Burn Asset

A brutal but useful action.

Sacrifice someone or something to reduce Heat, close a loose end, or send a message.

It should work.

It should also haunt the game.

---

# The First Data Model Sketch

Do not overbuild, but the game needs a strong conceptual model.

```ts
type GameState = {
  id: string;
  seed: string;
  week: number;
  city: CityState;
  player: PlayerNetwork;
  pressures: Pressures;
  hidden: HiddenPressures;
  factions: Faction[];
  rivals: RivalMastermind[];
  operatives: Operative[];
  relationships: Relationship[];
  districts: District[];
  activeOperations: Operation[];
  eventLog: GameEvent[];
  flags: Record<string, boolean | number | string>;
};
```

## City

```ts
type CityState = {
  name: string;
  profile: CityProfile;
  districts: string[];
  campaignTension: CampaignTension;
  aestheticPalette: AestheticPalette;
};

type CityProfile =
  | "RAIN_NOIR"
  | "DESERT_NEON"
  | "CORPORATE_ARCOLOGY"
  | "GHOST_NET"
  | "PLEASURE_METROPOLIS"
  | "INDUSTRIAL_CATHEDRAL";

type CampaignTension =
  | "CORP_CRACKDOWN"
  | "SYNDICATE_SUCCESSION"
  | "GHOST_SIGNAL"
  | "BLACK_LEDGER_LEAK"
  | "NIGHTLIFE_WAR"
  | "MEMORY_PLAGUE"
  | "FRONTIER_COLLAPSE";
```

## District

```ts
type District = {
  id: string;
  name: string;
  archetype: DistrictArchetype;
  dominion: number;
  heat: number;
  instability: number;
  wealth: number;
  nightlife: number;
  corpPresence: number;
  ghostActivity: number;
  controllingFactionId?: string;
  venues: Venue[];
  tags: string[];
};

type DistrictArchetype =
  | "PLEASURE_DISTRICT"
  | "CORPORATE_SPIRE"
  | "DOCKLANDS"
  | "OLD_CITY"
  | "GHOST_NET_ZONE"
  | "INDUSTRIAL_MAW"
  | "LUXURY_ARCOLOGY"
  | "BLACK_MARKET"
  | "TRANSIT_UNDERWORLD";
```

## Faction

```ts
type Faction = {
  id: string;
  name: string;
  archetype: FactionArchetype;
  dispositionToPlayer: number;
  power: number;
  aggression: number;
  secrecy: number;
  wealth: number;
  honor: number;
  preferredPressure: keyof Pressures;
  knownSecrets: Secret[];
};

type FactionArchetype =
  | "MEGACORP"
  | "SYNDICATE"
  | "SECURITY_BUREAU"
  | "DATA_BROKER_NETWORK"
  | "NIGHTLIFE_HOUSE"
  | "MEMORY_CULT"
  | "SMUGGLER_LEAGUE"
  | "MERCENARY_GUILD"
  | "STREET_COLLECTIVE";
```

## Operative

```ts
type Operative = {
  id: string;
  name: string;
  archetype: OperativeArchetype;
  loyalty: number;
  stress: number;
  competence: number;
  subtlety: number;
  violence: number;
  charm: number;
  tech: number;
  occult?: number;
  secret?: Secret;
  traitIds: string[];
  status: OperativeStatus;
};

type OperativeArchetype =
  | "FIXER"
  | "INFILTRATOR"
  | "ENFORCER"
  | "GHOST_HACKER"
  | "SOCIALITE"
  | "SURGEON"
  | "COURIER"
  | "ASSASSIN"
  | "ORACLE"
  | "BODYGUARD";

type OperativeStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "INJURED"
  | "MISSING"
  | "COMPROMISED"
  | "DEAD"
  | "UNKNOWN";
```

## Relationship

```ts
type Relationship = {
  id: string;
  characterId: string;
  type: RelationshipType;
  intimacy: number;
  leverage: number;
  trust: number;
  volatility: number;
  danger: number;
  debt: number;
  tags: string[];
};

type RelationshipType =
  | "LIAISON"
  | "INFORMANT"
  | "RIVAL"
  | "PATRON"
  | "DEBTOR"
  | "PROTECTOR"
  | "OBSESSION"
  | "BLACKMAIL_TARGET"
  | "EX_LOVER"
  | "GHOST_ECHO";
```

This already suggests a game.

---

# Procedural Generation Layer

A new game begins with a generator, not a lore dump.

```ts
function generateCampaign(seed: string, config: CampaignConfig): GameState {
  const rng = createRng(seed);

  const city = generateCity(rng, config);
  const districts = generateDistricts(rng, city);
  const factions = generateFactions(rng, city, districts);
  const rivals = generateRivals(rng, factions, districts);
  const operatives = generateStartingOperatives(rng, config);
  const relationships = generateStartingRelationships(rng, factions, rivals);
  const pressures = generateStartingPressures(rng, config);

  return {
    id: createId(),
    seed,
    week: 1,
    city: { ...city, districts: districts.map((d) => d.id) },
    player: generatePlayerNetwork(rng),
    pressures,
    hidden: { ruin: 0 },
    factions,
    rivals,
    operatives,
    relationships,
    districts,
    activeOperations: [],
    eventLog: [],
    flags: {},
  };
}
```

The generator should create an immediate story triangle.

Every starting campaign should have:

1. An opportunity.
2. A threat.
3. A relationship complication.
4. A resource constraint.
5. A rival vector.

Example starting campaign:

```text
City: Veyr Halcyon
Profile: Rain Noir
Campaign Tension: Nightlife War

You control a failing private lounge called The Pale Circuit.

Your starting operatives:
- Mara Voss, infiltrator, loyal but carrying a hidden debt
- Juno Hex, ghost-hacker, brilliant and unstable
- Saint Calder, fixer, charming and probably lying

Major rival:
- Nyx Ardent, Velvet Tyrant, controls the eastern pleasure district

Opening opportunity:
A corporate heir wants protection during a forbidden auction.

Opening threat:
Security Bureau patrols are sweeping the district after a public execution.

Relationship complication:
Your former lover now manages Nyx Ardent’s money.
```

This is procedural but feels authored.

---

# The First Playable Loop

Each week has three phases.

## 1. Command Phase

The player reviews:

- pressure meters
- district map
- event feed
- operative status
- available operations
- faction messages
- relationship alerts

Then chooses a limited number of actions.

Action capacity matters.

```ts
type PlayerCapacity = {
  commandPoints: number;
  operativeSlots: number;
  socialActions: number;
};
```

The player cannot do everything.

This is the core source of tension.

## 2. Resolution Phase

The engine resolves:

- assigned operations
- passive pressure changes
- faction moves
- rival schemes
- relationship consequences
- random-but-weighted events
- hidden ruin effects

## 3. Fallout Phase

The game presents consequences:

- event cards
- pressure deltas
- new opportunities
- warnings
- complications
- injuries
- betrayals
- unlocks

The player should feel anticipation before clicking:

> **Advance Week**

That button is sacred.

---

# Operation Resolution

Operations should be where the systems sing.

```ts
type Operation = {
  id: string;
  type: OperationType;
  targetId?: string;
  districtId?: string;
  assignedOperativeIds: string[];
  riskProfile: RiskProfile;
  progress: number;
  durationWeeks: number;
  status: OperationStatus;
  stakes: OperationStakes;
};

type OperationType =
  | "BLACKMAIL"
  | "SABOTAGE"
  | "INFILTRATION"
  | "SEDUCTION"
  | "EXTRACTION"
  | "SMUGGLING"
  | "ASSASSINATION"
  | "MEMORY_THEFT"
  | "DEBT_COLLECTION"
  | "PROTECTION"
  | "FRONT_EXPANSION";
```

Every operation has:

```ts
type OperationStakes = {
  successEffects: Partial<Pressures>;
  failureEffects: Partial<Pressures>;
  exposureEffects: Partial<Pressures>;
  possibleSecrets?: Secret[];
  possibleRelationshipChanges?: RelationshipDelta[];
};
```

Resolution sketch:

```ts
function resolveOperation(
  state: GameState,
  operation: Operation,
  rng: Rng,
): OperationResolution {
  const operatives = operation.assignedOperativeIds.map((id) =>
    findOperative(state, id),
  );

  const skillScore = calculateSkillScore(operatives, operation);
  const riskScore = calculateRiskScore(state, operation);
  const loyaltyModifier = calculateLoyaltyModifier(operatives);
  const intelModifier = state.pressures.intel * 0.15;

  const successChance = clamp(
    50 + skillScore + intelModifier + loyaltyModifier - riskScore,
    5,
    95,
  );

  const roll = rng.nextInt(1, 100);

  if (roll <= successChance) {
    return successResolution(operation, roll, successChance);
  }

  return failureResolution(operation, roll, successChance, state, rng);
}
```

But the player should not see exact math unless in debug mode.

Player-facing:

```text
Chance: Favorable
Exposure Risk: Elevated
Loyalty Risk: Low
Potential Reward: High
```

---

# The Event Director

The city should not be purely random.

It needs a director.

```ts
type DirectorState = {
  stress: number;
  recentEventTags: string[];
  unresolvedWarnings: string[];
  lastMajorCrisisWeek?: number;
  playerMomentum: number;
};
```

The director decides what kind of event the campaign needs.

If the player is coasting:

- introduce opportunity with hidden cost
- rival makes a move
- relationship complication appears

If the player is collapsing on Easy:

- offer a costly recovery
- give warning instead of disaster

If the player is collapsing on Hard:

- compound the weakness
- force triage

Event selection:

```ts
function selectWeeklyEvents(state: GameState, rng: Rng): GameEvent[] {
  const candidates = eventLibrary.filter((event) =>
    event.conditions.every((condition) => evaluateCondition(condition, state)),
  );

  const weighted = candidates.map((event) => ({
    event,
    weight: calculateEventWeight(event, state),
  }));

  return weightedRandomSelection(weighted, rng, determineEventCount(state));
}
```

Events have tags:

```ts
type EventTag =
  | "HEAT"
  | "LOYALTY"
  | "RIVAL"
  | "LIAISON"
  | "DISTRICT"
  | "OPPORTUNITY"
  | "BETRAYAL"
  | "HAUNTING"
  | "RESOURCE"
  | "VIOLENCE"
  | "CORP";
```

This lets the city feel responsive.

---

# Sample Event Definitions

```ts
const eventLibrary: GameEventDefinition[] = [
  {
    id: "corp_patrol_sweep",
    title: "Corp Patrol Sweep",
    body: "Private security units flood the lower avenues, checking faces against a list they insist does not exist.",
    tags: ["HEAT", "CORP"],
    conditions: [{ pressure: "heat", op: ">=", value: 35 }],
    effects: {
      heat: +6,
      intel: -2,
    },
    choices: [
      {
        id: "bribe_checkpoint_captain",
        label: "Bribe the checkpoint captain",
        cost: { resources: 1200 },
        effects: { heat: -8 },
      },
      {
        id: "feed_them_false_names",
        label: "Feed them false names",
        cost: { intel: 5 },
        effects: { heat: -4, dominion: +2 },
        risks: [{ type: "false_name_exposed", chance: 0.15 }],
      },
      {
        id: "do_nothing",
        label: "Let the sweep pass",
        effects: { heat: +3 },
      },
    ],
  },
  {
    id: "liaison_late_call",
    title: "A Call After Midnight",
    body: "A liaison you have not heard from in weeks opens a secure channel. Their voice is soft, expensive, and afraid.",
    tags: ["LIAISON", "OPPORTUNITY"],
    conditions: [{ relationshipType: "LIAISON", op: "exists" }],
    choices: [
      {
        id: "take_the_call",
        label: "Take the call",
        effects: { intel: +6 },
        relationshipEffects: [{ trust: +4, volatility: +3 }],
      },
      {
        id: "send_an_operative",
        label: "Send an operative instead",
        effects: { intel: +3 },
        relationshipEffects: [{ trust: -3, leverage: +2 }],
      },
      {
        id: "ignore_it",
        label: "Ignore it",
        relationshipEffects: [{ trust: -8, volatility: +5 }],
      },
    ],
  },
];
```

This already feels like Haunted Apex.

---

# Visual Layer: Asset Philosophy

The game should not attempt to render a full 3D city.

It should feel like a luxurious intelligence archive.

Primary visual assets:

```ts
type VisualAssetType =
  | "DISTRICT_SCENE"
  | "VENUE_SCENE"
  | "PORTRAIT"
  | "EVENT_SPLASH"
  | "FACTION_SIGIL"
  | "BACKGROUND_TEXTURE"
  | "MAP_OVERLAY"
  | "MEMORY_FRAGMENT";
```

Assets are tagged.

```ts
type VisualAsset = {
  id: string;
  type: VisualAssetType;
  path: string;
  tags: string[];
  palette: string[];
  mood: string[];
  source: "MIDJOURNEY" | "HANDMADE" | "PROCEDURAL" | "COMPOSITE";
  aspectRatio: "16:9" | "1:1" | "4:5" | "21:9";
};
```

The game chooses art by metadata, not hardcoded references.

Example:

```ts
function selectEventArt(event: GameEvent, assets: VisualAsset[], rng: Rng) {
  const candidates = assets.filter(
    (asset) =>
      asset.type === "EVENT_SPLASH" &&
      event.tags.some((tag) => asset.tags.includes(tag.toLowerCase())),
  );

  return weightedPick(candidates, rng);
}
```

This lets a small art library feel much larger.

---

# The Sound Layer

Music is not background wallpaper.

It is city-state.

```ts
type MusicState = {
  intensity: "LOW" | "MEDIUM" | "HIGH";
  districtTheme?: string;
  dangerLayer: boolean;
  hauntingLayer: boolean;
  vocalsEnabled: boolean;
};
```

Music reacts to state:

- high Heat adds percussion or tension layer
- high Ruin adds ghost pads/glitches
- nightclub district uses dark house
- operation resolution uses pulse-heavy cue
- betrayal uses silence or distorted motif

Settings:

```ts
type AudioSettings = {
  musicEnabled: boolean;
  vocalsEnabled: boolean;
  streamerMode: boolean;
  dynamicIntensity: boolean;
  volume: number;
};
```

This is part of the IP.

---

# First Screen Concepts

## 1. The Black Ledger

Main dashboard.

Shows:

- Dominion
- Heat
- Loyalty
- Resources
- Intel
- Ruin, maybe hidden until discovered
- current week
- active operations
- urgent alerts
- city map preview

Emotional feel:

> “Everything is under control until you look closely.”

## 2. City Map

Procedural district control surface.

Shows:

- district names
- faction control
- heat zones
- player influence
- active operations
- known secrets
- rival movement

Should look like an illuminated criminal cartography system.

## 3. Operative Dossiers

Roster screen.

Shows:

- portraits
- archetype
- skills
- loyalty
- stress
- secrets, if known
- current assignment
- relationship hooks

Operatives should feel like beautiful liabilities.

## 4. Operations Board

Where the player plans actions.

Shows:

- available operations
- requirements
- assigned operatives
- estimated risk
- predicted pressure effects
- possible fallout

This is one of the core gameplay screens.

## 5. Relationship Web

Not a dating menu.

A power graph.

Shows:

- liaisons
- rivals
- informants
- debtors
- ex-lovers
- patrons
- blackmail targets
- trust/leverage/intimacy/danger

This could be one of the signature screens.

## 6. Event Feed

The city speaks.

Events should look like intercepted messages, reports, whispers, dossiers, emergency flashes.

---

# Sample UI View Model

```ts
type DashboardView = {
  week: number;
  cityName: string;
  pressures: PressureView[];
  urgentEvents: EventCardView[];
  activeOperations: OperationSummaryView[];
  notableRelationships: RelationshipSummaryView[];
  mapSummary: CityMapSummaryView;
};

type PressureView = {
  id: keyof Pressures | "ruin";
  label: string;
  value: number;
  status: "LOW" | "STABLE" | "ELEVATED" | "CRITICAL";
  trend: "UP" | "DOWN" | "FLAT";
  description: string;
};
```

The UI should not bind directly to raw game state. It receives view models.

That keeps the engine clean.

---

# The First Vertical Slice

The first playable prototype should be called internally:

> **District Zero**

Scope:

```text
1 district
2 rival factions
3 operatives
1 liaison
5 core pressures
6 actions
10 events
1 operation type
1 victory
2 failure states
```

The story:

You operate from a failing lounge in a contested pleasure district. A corporate security sweep is coming. A rival kingpin is expanding. A liaison offers access to a forbidden auction. You have six weeks to establish dominance or get erased.

Win:

```text
Dominion >= 50 by Week 6
```

Lose:

```text
Heat >= 100
or Loyalty <= 0
or Resources < 0
```

This is tiny but real.

---

# The First Question the Prototype Must Answer

Not “is the lore good?”

Not “is the UI beautiful?”

Not “is the data model scalable?”

The first question is:

> **Does the player care before clicking Advance Week?**

The whole game lives in that moment.

They should think:

```text
If I send Mara to the auction, I might gain enough Intel to blackmail the inspector.
But Mara is stressed, and if the job goes loud, Heat spikes.
If I lay low instead, Nyx takes more of the district.
If I bribe the sweep captain, I survive this week but go broke.
If I call the liaison personally, I might strengthen the relationship, but that always seems to cost me later.
```

That is Haunted Apex.

---

# Layer 1 Conclusion

At this layer, the game is not yet about hundreds of assets, advanced AI, complex lore, or a perfect architecture.

It is about proving one idea:

> **A UI-driven management sim can feel intoxicating when the interface is a throne, the city is procedural, and every decision converts power into danger.**

The engine is pressure math.

The world is cyber-noir procedural fiction.

The player fantasy is dominion through relationships, secrets, operations, and style.

The first real build should be small enough to finish and rich enough to feel dangerous.

That is the first layer.
