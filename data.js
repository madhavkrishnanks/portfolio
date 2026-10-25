/* ------------------------------------------------------------------
   SITE CONTENT
   ------------------------------------------------------------------
   This is the only file you need to edit to update the site.
   Everything on every page is rendered from here.

   How to add a project:
     1. Copy one object in PROJECTS below.
     2. Give it a unique `slug` (lowercase, hyphens). That becomes
        the URL: project.html?p=your-slug
     3. Fill the fields.
     4. Save, refresh. Nothing to rebuild.

   Images: put files in an images/ folder next to index.html and add
   { src: "images/board.jpg", caption: "..." } to a project's `media`
   array. Leave `src` out and you get an empty frame with the caption
   inside it, which is what the site shows right now.
   ------------------------------------------------------------------ */

const PROFILE = {
  name: "K.S. Madhavkrishnan",
  role: "Electronics & Embedded Engineer",
  tagline:
    "I write the protocol layer by hand, watch it on a logic analyser, then build the board that runs it.",
  location: "Chennai, India",
  status: "Open to hardware / embedded internships",
  email: "ksmadhavkrishnan@gmail.com",
  links: [
    { label: "GitHub", href: "https://github.com/madhavkrishnanks" },
    { label: "Resume", href: "resume.pdf" }
  ]
};

const PROJECTS = [
  {
    slug: "smart-assistive-keyboard",
    title: "Smart Assistive Keyboard",
    summary:
      "A driverless USB-HID typing interface for motor-impaired users, built on a Raspberry Pi Pico W.",
    year: "2026",
    role: "Solo — academic project",
    stack: ["RP2040", "CircuitPython", "USB HID", "SPI", "Power"],
    body: [
      "People with limited motor control often cannot use a conventional keyboard, and most assistive input devices assume a host-side driver or a companion app. This one assumes nothing: the Pico W enumerates as a standard USB HID keyboard, so it types on any machine the moment it is plugged in.",
      "Input comes from a joystick and tactile buttons, resolved through a multi-layer key mapping — the joystick navigates, the buttons select — with a dead zone and hysteresis on the joystick so a resting hand does not produce a stream of phantom characters. An ST7735 TFT on SPI shows the current character and menu state, so the user is never typing blind.",
      "Power is a rechargeable 2S Li-ion pack with a BMS, USB Type-C charging and a regulated system rail, so the device runs untethered."
    ],
    highlights: [
      "1st place, Research Paper Presentation — MICA 2026, national level symposium",
      "Enumerates as a standard USB HID keyboard: no driver, no companion software",
      "Multi-layer input with joystick dead zone and hysteresis",
      "Rechargeable 2S Li-ion supply with BMS, USB-C charging and a regulated rail"
    ],
    links: [
      {
        label: "Repository",
        href: "https://github.com/madhavkrishnanks/assistive-rotary-keyboard"
      }
    ],
    media: [
      { caption: "Assembled unit — Pico W, TFT and joystick in the enclosure" },
      { caption: "Keypresses arriving on a host as standard HID events" },
      { caption: "Power section — 2S Li-ion pack, BMS and USB-C charging" },
      { caption: "Award certificate — MICA 2026" }
    ]
  },

  {
    slug: "ft232r-spi-flash",
    title: "FT232R SPI Flash Interface",
    summary:
      "Driving a Winbond W25Q64JV SPI flash from a PC through the FT232R's GPIO, with every transaction decoded on a logic analyser.",
    year: "2026",
    role: "Solo — personal project",
    stack: ["FT232R", "SPI", "Python", "PulseView"],
    body: [
      "The FT232R is normally a USB-to-serial bridge. Its GPIO pins can be driven from Python, which makes it a cheap way to speak SPI to a part straight from a PC with no microcontroller in the middle — and a good way to learn a protocol, because you own every clock edge.",
      "I implemented the SPI transaction layer in Python, then worked through the W25Q64JV against its datasheet: read the JEDEC ID, read and write the status register, and check that each command returns what the datasheet says it should.",
      "Every transaction was captured on a USB logic analyser and decoded in PulseView. A bit-banged clock is unforgiving about timing and chip-select edges, so most of the work was in the captures rather than the code."
    ],
    highlights: [
      "JEDEC ID read back matching the manufacturer and device ID in the datasheet",
      "Status register read and write verified against the datasheet's bit definitions",
      "Every transaction captured and decoded in PulseView"
    ],
    links: [
      {
        label: "Repository",
        href: "https://github.com/madhavkrishnanks/FT232R-SPI-Flash"
      }
    ],
    media: [
      { caption: "FT232R and W25Q64JV on the bench" },
      { caption: "PulseView capture — JEDEC ID transaction, CS to clock" },
      { caption: "Status register write sequence, decoded" }
    ]
  },

  {
    slug: "ft232r-i2c-eeprom",
    title: "FT232R I2C EEPROM Interface",
    summary:
      "An I2C master written in Python on the FT232R's GPIO, talking to an AT24C256 EEPROM and checked on a logic analyser.",
    year: "2026",
    role: "Solo — personal project",
    stack: ["FT232R", "I2C", "Python", "PulseView"],
    body: [
      "Same idea as the SPI work, different protocol: an I2C master implemented in Python on the FT232R's GPIO lines, addressing an AT24C256 EEPROM.",
      "Byte and page writes, sequential reads, and a full read-back to confirm what went in is what comes out. START, STOP, ACK and the address-plus-data framing were all verified on captures rather than assumed from a successful return value.",
      "Building the master by hand is what made I2C click — open-drain lines, the acknowledge bit, and why a missing pull-up looks exactly like a dead device."
    ],
    highlights: [
      "Byte and page write, sequential read, and full read-back verified",
      "START, STOP and ACK conditions confirmed in PulseView captures",
      "AT24C256 addressed over its full two-byte word address space"
    ],
    links: [
      {
        label: "Repository",
        href: "https://github.com/madhavkrishnanks/FT232R-I2C-EEPROM"
      }
    ],
    media: [
      { caption: "FT232R and AT24C256 on the bench" },
      { caption: "PulseView capture — address byte, ACK, data byte" },
      { caption: "Read-back dump compared against what was written" }
    ]
  },

  {
    slug: "smart-motor-control",
    title: "Smart Motor Control & Monitoring",
    summary:
      "An STM32 board that drives a brushed DC motor, measures its current, trips on overload, and keeps a timestamped event log in flash.",
    year: "2026",
    role: "Solo — coursework",
    stack: ["STM32F103", "PWM", "ADC", "I2C", "SPI", "UART"],
    body: [
      "Built around an STM32F103RBT6 with five peripherals running at once: PWM on TIM3 into a DRV8833 driver, an ACS712 current sense on the ADC, UART over an FT232R, an AT24C256 EEPROM on I2C, and a W25Q64 flash on SPI. Configuration lives in the EEPROM; the event history lives in the flash.",
      "The current sensor is auto-zeroed at boot, so the overload threshold is measured against a real baseline rather than a guessed one. When the threshold trips, the motor stops and the fault is written to the log with a timestamp.",
      "The UART, I2C and ADC paths are verified working on hardware. Five peripherals on one MCU means five things sharing a clock tree and a scheduler, and getting that configuration right was most of the project."
    ],
    highlights: [
      "Five peripherals integrated on one MCU — TIM3 PWM, ACS712 on ADC, FT232R UART, AT24C256 on I2C, W25Q64 on SPI",
      "Boot-time auto-zero calibration of the ACS712 baseline before the overload threshold is armed",
      "Overload trip stops the motor and writes a timestamped fault record to flash",
      "UART, I2C and ADC paths verified working"
    ],
    links: [],
    media: [
      { caption: "Board with the DRV8833 driver and motor terminals" },
      { caption: "Scope capture — PWM duty ramp and motor current" },
      { caption: "Overload trip and the resulting flash log entry" },
      { caption: "Block diagram — peripherals and buses" }
    ]
  },

  {
    slug: "skyguard-ai",
    title: "SkyGuard AI",
    summary:
      "Quality control for weather sensor networks: telling a real weather event apart from a sensor that has failed. SIH 2026, PS 26073 (MoES / IMD).",
    year: "2026",
    role: "Team Kestrel — Smart India Hackathon",
    stack: ["ESP32-C3", "MQTT", "FastAPI", "PyTorch", "React"],
    body: [
      "A failed sensor and a genuine weather event look identical in a single time series: both are a value that should not be there. The brief from MoES and IMD was to separate the two at network scale, so a dead sensor does not get reported as a heatwave.",
      "The pipeline runs from two BME280s on an ESP32-C3, published over MQTT to a FastAPI service, scored by a three-model ensemble — a Transformer-VAE, an Anomaly Transformer and an Isolation Forest — over 22 engineered features, and surfaced on a React dashboard.",
      "Benchmarked at roughly 90 ms per decision with about 265K parameters. On the frozen evaluation set: F1 0.835, precision 0.979, recall 0.728. Validated with an eight-scenario fault-injection harness that manufactures the failure modes the models are supposed to catch."
    ],
    highlights: [
      "F1 0.835 · precision 0.979 · recall 0.728 on the frozen evaluation set",
      "~90 ms per decision at ~265K parameters",
      "Three-model ensemble over 22 engineered features",
      "Validated with an eight-scenario fault-injection harness"
    ],
    links: [
      {
        label: "Repository",
        href: "https://github.com/madhavkrishnanks/SIH26073-Team-Kestrel"
      }
    ],
    media: [
      { caption: "Node — dual BME280 on an ESP32-C3" },
      { caption: "React dashboard with live node health" },
      { caption: "Fault-injection harness — eight scenarios, scores per run" },
      { caption: "Pipeline diagram — node to MQTT to FastAPI to model" }
    ]
  }
];

const EXPERIENCE = [
  {
    period: "Oct 2025 — Jan 2026",
    role: "IC Modeling & Validation Intern",
    org: "FOSSEE, IIT Bombay",
    place: "Remote",
    bullets: [
      "Implemented and simulated analog and mixed-signal IC models — op-amps, comparators, regulators, audio amplifiers — in eSim and NGSpice, working from manufacturer datasheets.",
      "Built SPICE subcircuits, schematic symbols and DC / AC / transient test benches from datasheet application circuits to verify each device's key behaviours.",
      "Authored a 56-page technical report covering the modelling, schematic capture and validation of 10+ ICs, including transistor-level subcircuit architecture and the behavioural simulation limits of specialised parts."
    ]
  },
  {
    period: "Aug 2024 — Present",
    role: "Undergraduate — Electronics",
    org: "SRM Institute of Science and Technology, Ramapuram",
    place: "Chennai",
    bullets: [
      "75% merit scholarship, awarded on entrance rank and maintained across academic years.",
      "Coursework and projects across embedded systems, analog circuits, hardware protocols and power electronics."
    ]
  }
];

const RECOGNITION = [
  {
    kind: "Award",
    date: "Oct 2026",
    title: "1st place — Research Paper Presentation",
    org: "MICA 2026, Sri Muthukumaran Institute of Technology",
    note: "Presented the Smart Assistive Keyboard at a national level symposium on modernisation and innovation in clinical applications."
  },
  {
    kind: "Award",
    date: "Oct 2024",
    title: "2nd place — Ideathon",
    org: "The Institution of Engineers",
    note: "Formulated and presented an engineering concept against a real-world problem statement."
  },
  {
    kind: "Scholarship",
    date: "Aug 2024",
    title: "75% Merit Scholarship",
    org: "SRMIST Ramapuram",
    note: "Awarded on entrance rank performance and maintained across academic years.",
    link: null
  },
  {
    kind: "Report",
    date: "Jan 2026",
    title: "Technical report — Designing IC subcircuits in eSim",
    org: "FOSSEE, IIT Bombay",
    note: "56 pages on modelling and validating 10+ analog and mixed-signal ICs — NE5532A, MC1495D, LM112, LM12CL, TIP122, TDA2003A, MC1460, MC1408 DAC — with DC sweep, AC response and transient settling test benches.",
    link: {
      label: "Read the report",
      href: "https://static.fossee.in/fossee/reports-2025/Reports-SLI-Autumn-2025/eSim/4%20Madhavkrishnan_K_S_esim_report%20%281%29.pdf"
    }
  },
  {
    kind: "Certificate",
    date: "Jan 2026",
    title: "Semester Long Autumn Internship 2025 — IC design with eSim subcircuits",
    org: "FOSSEE, IIT Bombay",
    note: "Internship certificate, ID 35afa.",
    link: {
      label: "Credential",
      href: "https://fossee.in/semester-internship/autumn/2025"
    }
  },
  {
    kind: "Workshop",
    date: "Jul 2025",
    title: "PCB design workshop",
    org: "E-Groots",
    note: "Schematic capture in EasyEDA, single and multi-layer layout and routing, design rules, ground and power planes, EMI mitigation, and the path from Gerbers to fabrication."
  },
  {
    kind: "Workshop",
    date: "Nov 2024",
    title: "Electronics Horizon",
    org: "DIPP Club, SRMIST Ramapuram",
    note: "Sessions on satellite payload electronics, telemetry, semiconductor trends and embedded architectures."
  },
  {
    kind: "Hackathons",
    date: "2026",
    title: "Ossome Hacks 3.0 · Fastathon · THREX",
    org: "SRMIST Kattankulathur · Unstop · Gritscape",
    note: "Idea and rapid-build rounds across three national level hackathons, including Team GridNexus at Fastathon."
  }
];

const SKILLS = [
  {
    group: "Hardware",
    items: [
      { name: "Schematic capture", level: "Intermediate" },
      { name: "PCB layout (EasyEDA)", level: "Intermediate" },
      { name: "Soldering & rework", level: "Intermediate" },
      { name: "Power & battery management", level: "Intermediate" }
    ]
  },
  {
    group: "Analog & simulation",
    items: [
      { name: "SPICE — eSim / NGSpice", level: "Advanced" },
      { name: "LTspice", level: "Intermediate" },
      { name: "Datasheet-driven modelling", level: "Advanced" },
      { name: "Op-amp & regulator circuits", level: "Intermediate" }
    ]
  },
  {
    group: "Embedded",
    items: [
      { name: "MicroPython / CircuitPython", level: "Advanced" },
      { name: "Embedded C — STM32", level: "Intermediate" },
      { name: "Peripheral configuration", level: "Intermediate" },
      { name: "Interrupts & state machines", level: "Intermediate" }
    ]
  },
  {
    group: "Protocols",
    items: [
      { name: "SPI", level: "Advanced" },
      { name: "I2C", level: "Advanced" },
      { name: "UART", level: "Advanced" },
      { name: "USB HID · MQTT", level: "Intermediate" }
    ]
  },
  {
    group: "Test & tools",
    items: [
      { name: "Logic analyser / PulseView", level: "Advanced" },
      { name: "Oscilloscope", level: "Intermediate" },
      { name: "Python", level: "Advanced" },
      { name: "Git & GitHub", level: "Intermediate" }
    ]
  }
];

const ABOUT = {
  paragraphs: [
    "I am an electronics undergraduate at SRM Institute of Science and Technology, Ramapuram. Most of what I know came from taking a protocol apart until it stopped being magic — I have spent the last year writing I2C and SPI masters in Python on an FT232R just to watch the transactions on a logic analyser, then rebuilding the same buses properly on an STM32.",
    "I spent a semester at FOSSEE, IIT Bombay modelling analog and mixed-signal ICs in eSim and NGSpice against manufacturer datasheets, which is where I learned to read a datasheet as a specification rather than a reference. I am looking for hardware or embedded internship work where the board actually has to run."
  ],
  now: [
    { label: "Building", value: "Smart Assistive Keyboard — Pico W, USB HID, 2S Li-ion" },
    { label: "Learning", value: "STM32 peripheral bring-up at register level" },
    { label: "Looking for", value: "Hardware / embedded internship" }
  ]
};
