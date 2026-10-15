export const CHAMBERS = [
  {
    id: 0,
    code: 'CH.00',
    slug: 'TRANSDUCER',
    name: 'INTENT TRANSDUCER',
    subtitle: 'LIVE VIBE-TO-REALITY COMPILER',
    coord: 'AZ 000.0° // EL +14.2° // R 1.00',
    cameraPos: { x: 0.0, y: 0.15, z: 4.3 },
    cameraLook: { x: -0.25, y: 0.0, z: 0.0 }
  },
  {
    id: 1,
    code: 'CH.01',
    slug: 'SPECIMENS',
    name: 'CARTRIDGE VAULT',
    subtitle: 'SHIPPED HALLUCINATIONS (< 96 HRS)',
    coord: 'AZ 060.0° // EL -08.5° // R 1.12',
    cameraPos: { x: 1.1, y: -0.2, z: 4.0 },
    cameraLook: { x: 0.2, y: 0.0, z: 0.0 }
  },
  {
    id: 2,
    code: 'CH.02',
    slug: 'INCINERATOR',
    name: 'DEATH OF THE SEMICOLON',
    subtitle: 'ENTROPY COMPRESSION & RITUAL PURGE',
    coord: 'AZ 120.0° // EL +22.0° // R 0.94',
    cameraPos: { x: -0.9, y: 0.5, z: 4.1 },
    cameraLook: { x: -0.1, y: 0.0, z: 0.0 }
  },
  {
    id: 3,
    code: 'CH.03',
    slug: 'ANATOMY',
    name: 'THE TASTE ENGINE',
    subtitle: 'EXPLODED 4-STRATUM ARCHITECTURE',
    coord: 'AZ 180.0° // EL +04.0° // R 1.25',
    cameraPos: { x: 0.3, y: 0.25, z: 4.6 },
    cameraLook: { x: 0.0, y: 0.0, z: 0.0 }
  },
  {
    id: 4,
    code: 'CH.04',
    slug: 'LAWS',
    name: 'SEVEN LAWS OF FEELING',
    subtitle: 'POST-SYNTAX MANIFESTO & TELEMETRY',
    coord: 'AZ 240.0° // EL -18.4° // R 0.88',
    cameraPos: { x: 0.0, y: -0.4, z: 3.8 },
    cameraLook: { x: 0.0, y: 0.0, z: 0.0 }
  },
  {
    id: 5,
    code: 'CH.05',
    slug: 'TRANSMIT',
    name: 'COMMISSION A FEVER DREAM',
    subtitle: 'FREQUENCY ESTIMATOR & DISPATCH',
    coord: 'AZ 300.0° // EL +09.1° // R 1.05',
    cameraPos: { x: -0.7, y: 0.1, z: 4.2 },
    cameraLook: { x: -0.2, y: 0.0, z: 0.0 }
  }
];

export const VIBE_PRESETS = [
  {
    id: 'tokyo-atm',
    label: '1997 TOKYO ATM @ 3AM',
    prompt: 'A high-frequency DeFi liquidity terminal that feels like a rain-slicked 1997 Shibuya CRT ATM with heavy mechanical solenoid keys and phosphor amber telemetry.',
    temp: 78,
    density: 88,
    entropy: 34,
    tokens: ['CRT_PHOSPHOR_AMBER', 'SOLENOID_DETENT_90HZ', 'BRUTAL_GRID_LOCK', 'ZERO_LATENCY_TAPE'],
    compilerOutput: {
      archetype: 'TACTILE FINANCIAL INSTRUMENT',
      shaderProfile: 'Sub-pixel Scanline Refraction + Halftone Bloom',
      interactionModel: 'Zero-modal mechanical latch triggers with 18ms acoustic feedback',
      stack: 'WebGL2 + Rust/WASM Orderbook + Procedural FM Synth',
      timeToShip: '64 HOURS',
      previewTitle: 'SHIBUYA // LIQUIDITY DECK v0.9',
      previewMetric: '¥ 482,910,400 // SPREAD 0.002%',
      previewStatus: 'SOLENOID LOCK ENGAGED',
      accent: '#FF9900'
    }
  },
  {
    id: 'jodorowsky-bank',
    label: 'BANK BY JODOROWSKY',
    prompt: 'A private wealth & sovereign treasury OS art-directed by Alejandro Jodorowsky and Dieter Rams: sacred geometric brass astrolabes fused with stark German industrial minimalism.',
    temp: 92,
    density: 54,
    entropy: 76,
    tokens: ['SACRED_ASTROLANE_UI', 'DIETER_RAMS_GRID', 'ALCHEMICAL_GOLD_VOID', 'ORBITAL_LEDGER'],
    compilerOutput: {
      archetype: 'ESOTERIC SOVEREIGN TREASURY',
      shaderProfile: 'Dichroic Gold-Obsidian Thin-Film + Non-Euclidean Orbitals',
      interactionModel: 'Planetary dial alignment replaces nested dropdown menus',
      stack: 'Three.js Custom Raymarcher + Edge Consensus Engine',
      timeToShip: '79 HOURS',
      previewTitle: 'AURELIA // CELESTIAL VAULT',
      previewMetric: 'ORBITAL RESERVE: 99.94% HARMONIC',
      previewStatus: 'SYZYGY CONFIRMED // VAULT OPEN',
      accent: '#FF2E00'
    }
  },
  {
    id: 'quake-spreadsheet',
    label: 'QUAKE III SPREADSHEET',
    prompt: 'A multiplayer enterprise data engine with the visceral kinetic physics, railgun momentum, and 144fps arena responsiveness of Quake III Arena.',
    temp: 85,
    density: 94,
    entropy: 62,
    tokens: ['STRAFE_JUMP_CELLS', '144FPS_ARENA_DOM', 'RAILGUN_QUERY_BEAM', 'MULTIPLAYER_FRAGS'],
    compilerOutput: {
      archetype: 'KINETIC ARENA DATA ENGINE',
      shaderProfile: 'High-Velocity Chromatic Shear + Shockwave Displacement',
      interactionModel: 'Momentum-preserving viewport strafing & instant beam-joins',
      stack: 'Custom WebGPU/WebGL Instanced Grid + CRDT Lockstep',
      timeToShip: '58 HOURS',
      previewTitle: 'FRAGSHEET // ARENA SQL',
      previewMetric: '1,400,000 ROWS @ 0.4ms QUERY',
      previewStatus: 'QUAD DAMAGE MULTIPLIER ACTIVE',
      accent: '#D4FF00'
    }
  },
  {
    id: 'cern-perfume',
    label: 'PERFUME AT CERN',
    prompt: 'A bespoke molecular fragrance house e-commerce experience set inside a cryogenic particle detector at CERN—customers collide scent molecules in 3D space to synthesize a bottle.',
    temp: 42,
    density: 68,
    entropy: 89,
    tokens: ['CRYOGENIC_GLASS', 'BOSON_SCENT_TRAILS', 'CLOUD_CHAMBER_CART', 'MAGNETIC_CONFINEMENT'],
    compilerOutput: {
      archetype: 'MOLECULAR LUXURY COLLIDER',
      shaderProfile: 'Cryogenic Vapor Trails + Chromatic Dispersion Glass',
      interactionModel: 'Drag two scent isotopes into magnetic collision to checkout',
      stack: 'GLSL Curl-Noise Particle Field + Headless Spatial Commerce',
      timeToShip: '71 HOURS',
      previewTitle: 'ISOTOPE N°09 // COLLIDER',
      previewMetric: 'COLLISION ENERGY: 13.6 TeV // NOTES: OUD + OZONE',
      previewStatus: 'STABLE MOLECULE SYNTHESIZED',
      accent: '#00F0FF'
    }
  }
];

export const SPECIMENS = [
  {
    id: 'SPEC-01',
    slot: 'ROM // 01',
    title: 'VESPERS.FM',
    category: 'GENERATIVE SPATIAL RADIO & FOCUS OS',
    hoursToBuild: '62 HRS',
    handwrittenLines: '0',
    vibeIterations: '384',
    tasteScore: '99.4%',
    initialPrompt: '"Make an ambient focus radio that feels like tuning a shortwave receiver inside a brutalist monastery during a geomagnetic storm."',
    architecture: 'Procedural WebAudio DSP graph + 60fps GLSL magnetosphere visualizer + zero-latency multiplayer listening rooms.',
    impact: '140,000+ monthly active listeners; 68-minute average session duration; featured on front page of Designer News & HN.',
    metrics: [
      { k: 'BUILD VELOCITY', v: '62 HOURS' },
      { k: 'DSP VOICE NODES', v: '16 REALTIME' },
      { k: 'FRAME BUDGET', v: '4.1 ms / 120Hz' },
      { k: 'RETENTION D30', v: '64.8%' }
    ],
    geometryMode: 1,
    color: '#FF2E00'
  },
  {
    id: 'SPEC-02',
    slot: 'ROM // 02',
    title: 'KINETIC LEDGER',
    category: 'HAPTIC INSTITUTIONAL TREASURY TERMINAL',
    hoursToBuild: '84 HRS',
    handwrittenLines: '0',
    vibeIterations: '519',
    tasteScore: '98.9%',
    initialPrompt: '"Bloomberg Terminal reimagined by Teenage Engineering and NASA JPL—every capital allocation feels like docking a spacecraft."',
    architecture: 'Custom canvas-rendered virtualized order matrix + physical spring-detent command dials + real-time websocket risk shaders.',
    impact: '$1.8B in routed institutional volume in Q1; replaced a 14-month legacy React rewrite in a single 4-day sprint.',
    metrics: [
      { k: 'BUILD VELOCITY', v: '84 HOURS' },
      { k: 'ROUTED VOLUME', v: '$1.8B+' },
      { k: 'LATENCY FLOOR', v: '11.2 ms' },
      { k: 'LEGACY REPLACED', v: '14 MONTHS' }
    ],
    geometryMode: 2,
    color: '#D4FF00'
  },
  {
    id: 'SPEC-03',
    slot: 'ROM // 03',
    title: 'MYCELIUM // CLOUD',
    category: 'AUTONOMOUS BIOTECH SWARM TOPOLOGY',
    hoursToBuild: '48 HRS',
    handwrittenLines: '0',
    vibeIterations: '290',
    tasteScore: '99.7%',
    initialPrompt: '"Kill the dashboard. Show 12,000 cold-chain biologic shipments as a living, self-healing bioluminescent organism."',
    architecture: 'Force-directed GPU instanced node graph + predictive anomaly reflex arcs + voice-to-shader natural command bar.',
    impact: 'Cut cold-chain spoilage triage time from 42 minutes to 9 seconds across 38 global distribution hubs.',
    metrics: [
      { k: 'BUILD VELOCITY', v: '48 HOURS' },
      { k: 'LIVE NODES', v: '12,000 GPU' },
      { k: 'TRIAGE SPEEDUP', v: '280x FASTER' },
      { k: 'DASHBOARDS KILLED', v: '19 TABLES' }
    ],
    geometryMode: 3,
    color: '#00FFAA'
  },
  {
    id: 'SPEC-04',
    slot: 'ROM // 04',
    title: 'SOLARIS SKIN',
    category: 'BIOMETRIC LUXURY COMMERCE ENGINE',
    hoursToBuild: '71 HRS',
    handwrittenLines: '0',
    vibeIterations: '445',
    tasteScore: '99.2%',
    initialPrompt: '"An avant-garde skincare flagship where the store reads your cursor tremor and hesitation, slowing down time and shifting lighting to match your nervous system."',
    architecture: 'Cursor-kinematics state machine + custom variable-font optical morphing + real-time subsurface scattering product shaders.',
    impact: '4.7x conversion lift over standard Shopify flagship; 0% bounce rate on mobile WebGL product inspection.',
    metrics: [
      { k: 'BUILD VELOCITY', v: '71 HOURS' },
      { k: 'CONVERSION LIFT', v: '+370%' },
      { k: 'SUBSURFACE FPS', v: '60 LOCKED' },
      { k: 'AOV INCREASE', v: '+$215' }
    ],
    geometryMode: 4,
    color: '#FF48B0'
  },
  {
    id: 'SPEC-05',
    slot: 'ROM // 05',
    title: 'HYPER-INDEX // 9',
    category: '4D SPATIAL RESEARCH & CITATION LOOM',
    hoursToBuild: '53 HRS',
    handwrittenLines: '0',
    vibeIterations: '312',
    tasteScore: '99.6%',
    initialPrompt: '"Let frontier physics & AI researchers fly through 400,000 arXiv papers like an air-traffic controller inside a tesseract."',
    architecture: 'UMAP 3D embedding projection + WebGL instanced glyph atlas + semantic gravity wells that pull related theorems together.',
    impact: 'Adopted by 4 frontier research labs; reduced literature synthesis cycles from weeks to a single afternoon.',
    metrics: [
      { k: 'BUILD VELOCITY', v: '53 HOURS' },
      { k: 'EMBEDDED PAPERS', v: '400,000+' },
      { k: 'SEARCH PARADIGM', v: 'GRAVITY WELL' },
      { k: 'LAB ADOPTION', v: '4 FRONTIER' }
    ],
    geometryMode: 5,
    color: '#3870FF'
  }
];

export const LEGACY_RITUALS = [
  { id: 'jira', name: '47-TICKET SPRINT CEREMONY', waste: '320 HRS LOST', desc: 'Translating a 10-second feeling into 19 story-pointed subtasks nobody reads.' },
  { id: 'pr', name: 'BIKESHEDDING PR THREAD (#419)', waste: '84 HRS LOST', desc: 'Six senior engineers arguing over abstract factory naming while the market shifts.' },
  { id: 'figma', name: 'STATIC FIGMA HANDOFF DRIFT', waste: '210 HRS LOST', desc: 'Drawing dead pictures of software instead of sculpting the living shader directly.' },
  { id: 'committee', name: 'DESIGN SYSTEM COMMITTEE', waste: '490 HRS LOST', desc: 'Policing border-radius tokens until your product looks identical to 10,000 SaaS templates.' },
  { id: 'boilerplate', name: 'REDUX-SAGA BOILERPLATE TAX', waste: '160 HRS LOST', desc: 'Writing 4,000 lines of ceremonial glue code for a state transition that takes one prompt.' },
  { id: 'standup', name: 'DAILY STATUS THEATER', waste: '140 HRS LOST', desc: 'Synchronizing human bottlenecks instead of orchestrating autonomous coding swarms.' }
];

export const STACK_STRATA = [
  {
    index: 'STRATUM // 01',
    title: 'ADVERSARIAL TASTE HARNESS',
    role: 'AESTHETIC & ARCHITECTURAL GOVERNANCE',
    coords: 'Z: +1.20m // CROWN NODE',
    summary: 'Raw LLMs regress to the mean—they want to output Bootstrap cards and purple gradients. Our proprietary Taste Harness pits 4 specialized agent personas (The Brutalist Architect, The Demoscene Shader Wizard, The Psychoacoustic Designer, and The Chaos Critic) against each other until anything generic is annihilated.',
    specs: ['ZERO-TEMPLATE CONSTRAINTS', 'AST TOPOLOGY VALIDATOR', 'VISUAL ENTROPY FLOOR > 0.88']
  },
  {
    index: 'STRATUM // 02',
    title: 'GLSL & VERLET PHYSICS KERNEL',
    role: 'SPATIAL & HAPTIC SURFACE ENGINE',
    coords: 'Z: +0.40m // OPTIC CORE',
    summary: 'We bypass flat DOM trees. Our studio synthesizes custom fragment shaders, raymarched signed-distance fields, spring-physics dampers, and 3D-to-2D projection matrices directly from mood boards, cinema frames, and physical industrial hardware references.',
    specs: ['CUSTOM GLSL PIPELINES', '60/120FPS GPU BUDGETING', 'REAL-TIME 3D DOM TETHERING']
  },
  {
    index: 'STRATUM // 03',
    title: 'SONIC & SUB-BASS PSYCHOACOUSTICS',
    role: 'NEURAL FEEDBACK & MICRO-TIMING',
    coords: 'Z: -0.40m // RESONANCE BAY',
    summary: 'Software feels dead because it is silent and weightless. We wire procedural WebAudio synthesis—solenoid clicks, resonant filter sweeps, and harmonic drones—directly into state transitions so every interaction has physical mass.',
    specs: ['ZERO-SAMPLE WEBAUDIO DSP', 'VELOCITY-COUPLED PITCH', 'SUB-12MS TACTILE TRANSIENTS']
  },
  {
    index: 'STRATUM // 04',
    title: 'AUTONOMOUS HARDENING FOUNDRY',
    role: 'PRODUCTION COMPILER & EDGE DEPLOY',
    coords: 'Z: -1.20m // BEDROCK',
    summary: 'Vibe coding without engineering rigor is a toy. Once the feeling locks in, our automated hardening swarm runs property-based fuzzing, memory-leak profiling, responsive viewport torture tests, and edge-compiled deployment.',
    specs: ['AUTOMATED PLAYWRIGHT SWARMS', 'WASM / EDGE HARDENED', 'PRODUCTION READY IN < 96H']
  }
];

export const MANIFESTO_LAWS = [
  {
    num: 'LAW I',
    headline: 'SYNTAX IS OBSOLETE; TASTE IS THE ONLY BOTTLENECK.',
    body: 'When code generation drops to zero marginal cost, the scarce resource is no longer typing speed—it is radical artistic conviction.'
  },
  {
    num: 'LAW II',
    headline: 'IF IT LOOKS LIKE A TEMPLATE, BURN IT AT THE ROOT.',
    body: 'Hero banner. Three feature cards. Pricing table. Footer. That layout is a sedative. Software should feel like stepping into an unfamiliar instrument.'
  },
  {
    num: 'LAW III',
    headline: 'PROTOTYPE AT THE SPEED OF HALLUCINATION.',
    body: 'We do not write specs about what we might build in Q3. We synthesize the working artifact before lunch and mutate it live with you by dinner.'
  },
  {
    num: 'LAW IV',
    headline: 'GIVE PIXELS MASS, FRICTION, AND ACOUSTIC WEIGHT.',
    body: 'Flat rectangles sliding up on scroll are dead. Use tension, catenary gravity, magnetic repulsion, and shader refraction.'
  },
  {
    num: 'LAW V',
    headline: 'REPLACE MEETINGS WITH LIVE MUTATION LOOPS.',
    body: 'One hour of live prompt-alchemy and shader tuning in our foundry replaces six weeks of cross-functional alignment theater.'
  },
  {
    num: 'LAW VI',
    headline: 'COUPLE THE UNCANNY WITH INDUSTRIAL PRECISION.',
    body: 'Wild creativity fails when it is sloppy. Every fever dream we ship is locked to Swiss typographic grids and 60fps GPU budgets.'
  },
  {
    num: 'LAW VII',
    headline: 'SHIP IN 72 HOURS OR IT HAS ALREADY CALCIFIED.',
    body: 'Velocity is an aesthetic quality. The tighter the loop between raw intuition and deployed reality, the purer the voltage.'
  }
];
