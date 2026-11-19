/* ------------------------------------------------------------------
   SITE CONTENT — Updated via Portfolio Admin Studio
   ------------------------------------------------------------------ */

const PROFILE = {
  "name": "Madhavkrishnan K S",
  "role": "Electronics & Embedded Engineer",
  "tagline": "I write the protocol layer by hand, watch it on a logic analyser, then build the board that runs it.",
  "location": "Chennai, India",
  "status": "Open to hardware / embedded internships",
  "email": "ksmadhavkrishnan@gmail.com",
  "links": [
    {
      "label": "GitHub",
      "href": "https://github.com/madhavkrishnanks"
    },
    {
      "label": "Resume",
      "href": "resume.pdf"
    }
  ]
};

const PROJECTS = [
  {
    "slug": "ev1527-rf-link",
    "title": "EV1527 · 433.92 MHz RF Link",
    "summary": "An Arduino Uno generating a 24-bit EV1527 baseband, carried over a 433.92 MHz OOK link, captured on a logic analyser and decoded by hand — then learned by a commercial learning relay.",
    "year": "2026",
    "role": "Independent bench project",
    "stack": [
      "Arduino Uno",
      "433.92 MHz OOK",
      "Logic Analysis",
      "Protocol Decoding"
    ],
    "body": [
      "EV1527 is the encoder inside almost every cheap 433 MHz remote, and the datasheet tells you far less than the signal does. So instead of buying a module and trusting it, I generated the baseband myself on an Arduino Uno's D8 pin, put it on air through an FS1000A-class 433.92 MHz OOK transmitter, and checked every claim twice — once on a Rigol DS1054Z and once on an 8-channel USB logic analyser running at 2 MHz.",
      "The frame is pulse-width modulated over on-off keying: a 250 µs unit t, where a zero is 1t high and 3t low and a one is 3t high and 1t low. Twenty-five pulses make a frame — one sync pulse plus 24 data bits, a 20-bit address and 4-bit data, MSB first. Measured against nominal, the bit period came out at 1.020 ms rather than 1.000 ms, the sync pulse at 252 µs high with a 7750 µs low, an active frame of roughly 32.25 ms, and a repeat period of about 42.4 ms once the 10 ms inter-repeat gap is counted.",
      "The first version was wrong in a way only a capture shows: the reference loop I started from emitted 32 data bits, 33 pulses per frame, against the 25 pulses the commercial remote actually sends. Fixing the loop to 24 data bits brought the frame into line. A second, smaller error showed up as roughly 20 µs of excess on every low period, which is the cost of AVR digitalWrite() and the delayMicroseconds() loop, not of the protocol. Automatic width measurement at 10 ms/div also quantised pulses to 200 µs display pixels, so pulse widths were measured at 500 µs/div instead.",
      "The RF side was the honest part. With no carrier present, the XD-RF-5V receiver's high-gain slicer turns ambient thermal noise into random transitions, which looks exactly like a signal until you compare it against a real one. Adding two 17.3 cm quarter-wave wire whips and transmitting continuously gave stable carrier recovery, and capturing TX on D8 and RX on D7 at the same time showed what actually survived the air link. The end of the chain is the proof: a 12 V Songle learning relay receiver learned the code my Arduino generated and actuated on it, with the reference key fob's own frames decoded alongside for comparison — button A as address 0x61371 with data 1000, button B the same address with 0100."
    ],
    "highlights": [
      "24-bit frame as 25 pulses: 1 sync plus 20-bit address and 4-bit data, MSB first",
      "Measured t = 250.0 µs and a 1.020 ms bit period against 1.000 ms nominal",
      "Active frame ~32.25 ms, repeated every ~42.4 ms with a 10 ms inter-repeat gap",
      "TX (D8) and RX (D7) captured together on an 8-channel 2 MHz logic analyser",
      "Corrected a 32-bit reference loop to the real 24-bit, 25-pulse frame",
      "12 V learning relay learned the generated code and actuated end to end"
    ],
    "links": [
      {
        "label": "Repository",
        "href": "https://github.com/madhavkrishnanks/EV1527_RF_Link"
      },
      {
        "label": "Wiki",
        "href": "https://github.com/madhavkrishnanks/EV1527_RF_Link/wiki/EV1527-Baseband,-433.92-MHz-Link,-Decode-and-Relay"
      }
    ],
    "media": [
      {
        "src": "images/ev1527-rf-link-01.webp",
        "caption": "FS1000A 433.92 MHz transmitter and XD-RF-5V receiver modules"
      },
      {
        "src": "images/ev1527-rf-link-02.webp",
        "caption": "Songle SRD-12VDC-SL-C 12 V learning relay receiver"
      },
      {
        "src": "images/ev1527-rf-link-03.webp",
        "caption": "Two-button EV1527 reference key fob"
      },
      {
        "src": "images/ev1527-rf-link-04.webp",
        "caption": "Bit timing at 500 µs/div — 250 µs high, 770 µs low, 1.020 ms period"
      },
      {
        "src": "images/ev1527-rf-link-05.webp",
        "caption": "25 pulses per frame (1 sync + 24 data) at 5 ms/div"
      },
      {
        "src": "images/ev1527-rf-link-06.webp",
        "caption": "TX (D8) and RX (D7) captured together at 2 MHz over 100 ms"
      },
      {
        "src": "images/ev1527-rf-link-07.webp",
        "caption": "Reference remote, button A — address 0x61371, data 1000"
      },
      {
        "src": "images/ev1527-rf-link-08.webp",
        "caption": "Receiver idle noise with no carrier present"
      }
    ]
  },
  {
    "slug": "aquachirp",
    "title": "AQUACHIRP — Software-Defined Sonar Transmitter",
    "summary": "A low-power acoustic transmitter payload for autonomous underwater vehicles, with the waveforms synthesised in software on an STM32. SIH 2026, PS 26058 (MoES / NIOT).",
    "year": "2026",
    "role": "Team Kestrel — Smart India Hackathon",
    "stack": [
      "STM32",
      "DMA",
      "Signal Processing",
      "Analog Design"
    ],
    "body": [
      "An AUV has a hard power budget and almost no room for a payload board, so the acoustic transmitter is usually the part that gets compromised. Instead of reaching for a dedicated DDS chip, I synthesised the waveforms in software on an STM32 and streamed them out through a timer and DMA — which means the CPU never computes a sine or a chirp per sample. The sample rate is set by the timer, the buffer is refilled by DMA, and the core is free for everything else.",
      "Four waveform families are generated: continuous wave, LFM chirp, geometric, and Barker-13 coded pulses. Barker-13 matters because a coded pulse buys you range resolution without shortening the pulse, which is the trade an AUV cannot otherwise afford.",
      "The analog side reconstructs the DAC output — an RC filter chain, a CD4053B multiplexer, and MCP6004 buffers — with a self-monitor path feeding back so the transmitter can check what it actually put into the water. Pulse parameters are adapted to the environment using the Mackenzie and Francois-Garrison sound-speed and absorption models, because the same pulse that works in shallow warm water is wrong in the deep.",
      "Bench measurement: about 8.1 mW for the whole signal chain at 3.3 V, and about 41 µJ per ping at a 10 Hz pulse repetition frequency."
    ],
    "highlights": [
      "~8.1 mW signal-chain draw at 3.3 V · ~41 µJ per ping at 10 Hz PRF",
      "CW, LFM chirp, geometric and Barker-13 waveforms synthesised on-chip",
      "Timer + DMA streaming: no per-sample trigonometry on the CPU",
      "Analog reconstruction chain with a self-monitor feedback path",
      "Pulse parameters adapted with the Mackenzie and Francois-Garrison models"
    ],
    "links": [
      {
        "label": "Repository",
        "href": "https://github.com/madhavkrishnanks/SIH26058-Team-Kestrel"
      }
    ],
    "media": [
      {
        "src": "images/aquachirp-01.webp",
        "caption": "Signal chain on the bench at 3.3 V — current draw read on the DMM (2.40 mA)"
      },
      {
        "src": "images/aquachirp-02.webp",
        "caption": "Scope capture — LFM chirp at the transducer drive"
      },
      {
        "src": "images/aquachirp-03.webp",
        "caption": "Power measurement — signal chain at 3.3 V"
      },
      {
        "caption": "Block diagram — STM32, DMA, reconstruction chain, self-monitor"
      },
      {
        "src": "images/aquachirp-04.webp",
        "caption": "Waveform comparison — CW, chirp and phase-coded captures"
      },
      {
        "src": "images/aquachirp-05.webp",
        "caption": "AUV hull concept — sensor ports for TDS, turbidity, depth and temperature"
      }
    ]
  },
  {
    "slug": "smart-assistive-keyboard",
    "title": "Smart Assistive Keyboard",
    "summary": "A driverless USB-HID typing interface for motor-impaired users, built on a Raspberry Pi Pico W.",
    "year": "2026",
    "role": "Academic project",
    "stack": [
      "RP2040",
      "CircuitPython",
      "USB HID",
      "SPI",
      "Power"
    ],
    "body": [
      "People with limited motor control often cannot use a conventional keyboard, and most assistive input devices assume a host-side driver or a companion app. This one assumes nothing: the Pico W enumerates as a standard USB HID keyboard, so it types on any machine the moment it is plugged in.",
      "Input comes from a joystick and tactile buttons, resolved through a multi-layer key mapping — the joystick navigates, the buttons select — with a dead zone and hysteresis on the joystick so a resting hand does not produce a stream of phantom characters. An ST7735 TFT on SPI shows the current character and menu state, so the user is never typing blind.",
      "Power is a rechargeable 2S Li-ion pack with a BMS, USB Type-C charging and a regulated system rail, so the device runs untethered."
    ],
    "highlights": [
      "1st place, Research Paper Presentation — MICA 2026, national level symposium",
      "Real user testing at Cheshire homes and Satyalok school of special children .",
      "Got several feedbacks from the caretakers of the disabled children ,they were so happy to see this kind of projects that will help these students to improve themselves ."
    ],
    "links": [
      {
        "label": "Repository",
        "href": "https://github.com/madhavkrishnanks/assistive-rotary-keyboard"
      }
    ],
    "media": [
      {
        "src": "images/smart-assistive-keyboard-01.webp",
        "caption": "Assembled prototype — six buttons, TFT, rotary encoder and Pico W"
      },
      {
        "src": "images/satyalok-image-2ok-1794069184728.webp",
        "caption": "User testing at Sathyalok School for Special Children in Porur."
      },
      {
        "src": "images/cheshire-image-2joystick-1794070524409.webp",
        "caption": "User testing at Cheshire Homes in Thiruvanmiyur"
      },
      {
        "src": "images/smart-assistive-keyboard-02.webp",
        "caption": "KiCad carrier board layout"
      }
    ]
  },
  {
    "slug": "smart-motor-control",
    "title": "Smart Motor Control & Monitoring",
    "summary": "An STM32 board that drives a brushed DC motor, measures its current, trips on overload, and keeps a timestamped event log in flash.",
    "year": "2026",
    "role": "Coursework — 21ECC301P, SRM IST (with Sanjay Gopi)",
    "stack": [
      "STM32F103",
      "DRV8833",
      "ACS712",
      "I²C",
      "SPI",
      "UART"
    ],
    "body": [
      "Built around an STM32F103RBT6 on a Nucleo-64 with five peripherals running at once: TIM3 PWM on PA6 and PA7 into a DRV8833 dual H-bridge, an ACS712 Hall-effect current sensor on ADC1 channel 0 through a 10k/20k divider, USART1 at 115200 through an FT232R bridge, an AT24C256 EEPROM on I²C1, and a W25Q64 flash on SPI2. The split is deliberate: configuration — maximum speed and current limit — lives in the small rewritable EEPROM, while the timestamped event history appends to the larger flash.",
      "The current sensor is auto-zeroed at boot: the ACS712 sits at a nominal 2.5 V at zero current, but the actual module output is offset slightly, so the firmware samples it once with the motor off and subtracts that as the reference. Without it the overload threshold would be measured against a guessed baseline. When the threshold trips, the motor stops and the fault is written to the log with a timestamp.",
      "Two things came out of testing that are worth keeping. The high-current path only works if the motor supply is wired in series through the ACS712's IP+ and IP− terminals with a genuinely common ground between controller, sensor and driver — that was checked with a multimeter before any motor power was applied. And the firmware is in C against the STM32 HAL in STM32CubeIDE, exercised from a browser-based serial console at 115200 baud: STATUS, SELFTEST, START, STOP and SPEED, with the console showing all five subsystem checks passing."
    ],
    "highlights": [
      "Five peripherals on one MCU — TIM3 PWM, ACS712 on ADC, FT232R UART, AT24C256 on I²C, W25Q64 on SPI",
      "Configuration in EEPROM, timestamped event log in flash — two memories on two buses by design",
      "Boot-time auto-zero of the ACS712 baseline before the overload threshold is armed",
      "Overload trip stops the motor and writes a timestamped fault record to flash",
      "Power stage verified with a multimeter before motor power: series current path, common ground"
    ],
    "links": [],
    "media": [
      {
        "src": "images/smart-motor-control-01.webp",
        "caption": "Bench rig — STM32 Nucleo, DRV8833 driver, ACS712 current sensor and the 2S pack"
      },
      {
        "src": "images/smart-motor-control-02.webp",
        "caption": "Block diagram — five peripherals on one STM32F103RBT6: PWM, ADC, UART, I²C and SPI"
      },
      {
        "src": "images/smart-motor-control-03.webp",
        "caption": "Serial console — all five subsystem self-tests passing at 115200 baud"
      },
      {
        "src": "images/smart-motor-control-04.webp",
        "caption": "Live monitor — RPM and current streamed while the same telemetry lands in EEPROM and flash"
      }
    ]
  },
  {
    "slug": "skyguard-ai",
    "title": "SkyGuard AI",
    "summary": "Quality control for weather sensor networks: deciding whether an unusual observation is a real weather event or a failed sensor, then repairing it rather than discarding it. SIH 2026, PS 26073 (Disaster Management).",
    "year": "2026",
    "role": "Team Kestrel — Smart India Hackathon",
    "stack": [
      "ESP32-C3",
      "FastAPI",
      "PyTorch",
      "MQTT",
      "React",
      "SHAP"
    ],
    "body": [
      "A dead sensor and a genuine weather event look identical in a single time series: both are a value that should not be there. The brief was to separate the two at network scale, so a failed sensor does not get reported as a heatwave — and so a real extreme is not thrown away as noise.",
      "The chain starts at the node: an ESP32-C3 reading two BME280s for temperature, humidity and pressure, with range, rate-of-change, sensor-consensus and freeze checks run at the edge before anything is transmitted, plus packet and timestamp integrity checks so corrupt data never reaches the models. Valid packets are published over MQTT to a FastAPI service that extracts 22 meteorological features from sliding windows and scores them with a three-model ensemble — a Transformer-VAE, an Anomaly Transformer and an Isolation Forest.",
      "What makes it more than an anomaly detector is that the decision is not 'anomaly equals fault'. Two scores are kept separate: an anomaly score as evidence of a fault, and an event score as evidence of real weather, each confirmed across four pillars — temporal, spatial against buddy stations, physics such as dew point and thermodynamic consistency, and multivariate agreement between variables. The fusion resolves to Normal, Genuine Event, Sensor Fault or Review, SHAP explains which features drove the call, and faulty points are imputed from neighbouring stations and historical trends instead of being dropped.",
      "It was built and tested on the Jena Climate dataset with five injected fault families — spike, drift, frozen, range and communication — and benchmarked at roughly 90 ms per decision with about 265K parameters. On the frozen evaluation set: F1 0.835, precision 0.979, recall 0.728."
    ],
    "highlights": [
      "Event-versus-fault disambiguation: S_anomaly and S_event kept as separate evidence",
      "Four-pillar validation — temporal, spatial, physics and multivariate",
      "Three-model ensemble over 22 engineered features from sliding windows",
      "Edge QC before transmission: range, rate, consensus, freeze and integrity checks",
      "Faulty observations imputed from buddy stations instead of discarded",
      "F1 0.835 · precision 0.979 · recall 0.728 · ~90 ms per decision at ~265K parameters"
    ],
    "links": [
      {
        "label": "Repository",
        "href": "https://github.com/madhavkrishnanks/SIH26073-Team-Kestrel"
      }
    ],
    "media": [
      {
        "src": "images/skyguard-ai-01.webp",
        "caption": "Node — ESP32-C3 with dual BME280 sensing temperature, humidity and pressure"
      },
      {
        "src": "images/skyguard-ai-02.webp",
        "caption": "React dashboard — station map, network telemetry and the QC scenario panel"
      },
      {
        "src": "images/skyguard-ai-03.webp",
        "caption": "Pipeline — edge QC, 22-feature engine, three-model ensemble, four-pillar validation, diagnosis"
      }
    ]
  },
  {
    "slug": "rehost",
    "title": "REhost — Active Phase-Balancing Controller",
    "summary": "A low-cost controller fitted at rooftop-solar connection points: it measures three-phase voltage, computes the IEEE 112 voltage unbalance factor, and reassigns the solar feed to a healthier phase before the feeder rejects it. SIH 2025, PS 25064 (Government of Kerala).",
    "year": "2025",
    "role": "Team Kestrel — Smart India Hackathon 2025",
    "stack": [
      "ESP32",
      "ZMPT101B",
      "SCT-013",
      "SSR switching",
      "IEEE 112"
    ],
    "body": [
      "Rooftop solar in India is almost always single-phase, so every household that installs it pushes its generation onto one phase of a three-phase LV feeder. Enough of that and the feeder unbalances: voltages drift, the distribution transformer runs hot, and the DISCOM starts rejecting new connections. Kerala alone had about 1500 MW of rooftop capacity riding on this. The equipment that fixes unbalance properly, a DSTATCOM or SVC, costs ₹5–15 lakh per feeder, which is why it is not deployed at the scale the problem exists at.",
      "REhost's answer is to put a cheap closed-loop controller only where the injection happens — the solar household — instead of a central device on the feeder. It senses all three phase voltages with ZMPT101B boards and the currents with SCT-013 clamps, computes the Voltage Unbalance Factor using the IEEE 112 standard formula on an ESP32, and when VU% crosses 2% it identifies which phase is overloaded and which is starved, decides a better assignment for that household's solar plus load, and actuates a switching matrix. It then re-reads the phases to confirm the unbalance actually improved, logs the event and shows the state on a local I²C OLED.",
      "The part worth being honest about is the switching hardware. Solid-state relays are what the prototype uses, and they are only good for demonstrating automated reassignment on a bench — they are not rated for continuous distribution-level duty. Utilities also cannot reconnect a house to a different phase at will, because of metering rules, safety procedure and the consumer's supply agreement, and neutral current and relay endurance both constrain how often you can switch. So the field version assumes utility-approved motorised or vacuum contactors and a DISCOM procedure around it, with the prototype proving only that the sense-decide-actuate loop closes in real time.",
      "The economics are what make the idea worth the regulatory fight: 250–750× cheaper than the DSTATCOM/SVC alternative, protection for appliances against the 210–250 V excursions that unbalance produces, and longer transformer life by removing continuous unbalance stress — which raises how much rooftop solar a feeder can host before anyone has to rebuild it."
    ],
    "highlights": [
      "IEEE 112 voltage unbalance factor computed on an ESP32 from ZMPT101B and SCT-013 sensing",
      "VU% above 2% triggers automatic reassignment of the solar + load combination",
      "Closed loop: sense, decide, actuate, re-verify, log — state shown on an I²C OLED",
      "250–750× cheaper than DSTATCOM / SVC at ₹5–15 lakh per feeder",
      "SSR switching in the prototype, utility-approved contactors assumed for field deployment",
      "SIH 2025, PS 25064 — Government of Kerala, Renewable Energy (hardware)"
    ],
    "links": [
      {
        "label": "Repository",
        "href": "https://github.com/madhavkrishnanks/REhost"
      }
    ],
    "media": [
      {
        "src": "images/rehost-01.webp",
        "caption": "Controller with the I²C OLED reading the three phase voltages at the solar connection point"
      },
      {
        "src": "images/rehost-02.webp",
        "caption": "Phase A at 9.87 V against 14.19 V on B and C — VU 22.6%, the unbalance the controller acts on"
      },
      {
        "src": "images/rehost-03.webp",
        "caption": "Relay configuration stepping through R1, R2 and R3 as the solar feed is reassigned"
      },
      {
        "src": "images/rehost-04.webp",
        "caption": "Sense → compute VU% by IEEE 112 → decide → actuate → re-verify and log"
      }
    ]
  },
  {
    "slug": "ft232r-spi-flash",
    "title": "FT232R SPI Flash Interface",
    "summary": "Driving a Winbond W25Q64JV SPI flash from a PC through the FT232R's GPIO, with every transaction decoded on a logic analyser.",
    "year": "2026",
    "role": "Solo — personal project",
    "stack": [
      "FT232R",
      "SPI",
      "Python",
      "PulseView"
    ],
    "body": [
      "The FT232R is normally a USB-to-serial bridge. Its GPIO pins can be driven from Python, which makes it a cheap way to speak SPI to a part straight from a PC with no microcontroller in the middle — and a good way to learn a protocol, because you own every clock edge.",
      "I implemented the SPI transaction layer in Python, then worked through the W25Q64JV against its datasheet: read the JEDEC ID, read and write the status register, and check that each command returns what the datasheet says it should.",
      "Every transaction was captured on a USB logic analyser and decoded in PulseView. A bit-banged clock is unforgiving about timing and chip-select edges, so most of the work was in the captures rather than the code."
    ],
    "highlights": [
      "JEDEC ID read back matching the manufacturer and device ID in the datasheet",
      "Status register read and write verified against the datasheet's bit definitions",
      "Every transaction captured and decoded in PulseView"
    ],
    "links": [
      {
        "label": "Repository",
        "href": "https://github.com/madhavkrishnanks/FT232R-SPI-Flash"
      }
    ],
    "media": [
      {
        "src": "images/ft232r-spi-flash-01.webp",
        "caption": "PulseView — read and write status register, decoded on the SPI bus"
      },
      {
        "src": "images/ft232r-spi-flash-02.webp",
        "caption": "W25Q64 instruction set — the four opcodes this capture implements, 06h, 50h, 05h and 01h"
      }
    ]
  },
  {
    "slug": "ft232r-i2c-eeprom",
    "title": "FT232R I2C EEPROM Interface",
    "summary": "An I2C master written in Python on the FT232R's GPIO, talking to an AT24C256 EEPROM and checked on a logic analyser.",
    "year": "2026",
    "role": "Solo — personal project",
    "stack": [
      "FT232R",
      "I2C",
      "Python",
      "PulseView"
    ],
    "body": [
      "Same idea as the SPI work, different protocol: an I2C master implemented in Python on the FT232R's GPIO lines, addressing an AT24C256 EEPROM.",
      "Byte and page writes, sequential reads, and a full read-back to confirm what went in is what comes out. START, STOP, ACK and the address-plus-data framing were all verified on captures rather than assumed from a successful return value.",
      "Building the master by hand is what made I2C click — open-drain lines, the acknowledge bit, and why a missing pull-up looks exactly like a dead device."
    ],
    "highlights": [
      "Byte and page write, sequential read, and full read-back verified",
      "START, STOP and ACK conditions confirmed in PulseView captures",
      "AT24C256 addressed over its full two-byte word address space"
    ],
    "links": [
      {
        "label": "Repository",
        "href": "https://github.com/madhavkrishnanks/FT232R-I2C-EEPROM"
      }
    ],
    "media": [
      {
        "src": "images/ft232r-i2c-eeprom-01.webp",
        "caption": "Read-back dump compared against what was written"
      },
      {
        "src": "images/ft232r-i2c-eeprom-02.webp",
        "caption": "PulseView capture — address byte, ACK, data byte"
      },
      {
        "src": "images/ft232r-i2c-eeprom-03.webp",
        "caption": "Single-byte write sequence, decoded"
      },
      {
        "caption": "FT232R and AT24C256 on the bench"
      }
    ]
  },
  {
    "slug": "vibratory-alginate-spatula",
    "title": "Vibratory Alginate Mixing Spatula",
    "summary": "A motor-driven vibrating spatula that mixes dental alginate evenly, built with SRM Dental College and E-Cell.",
    "year": "2026",
    "role": "Team — SRM Dental College and E-Cell, SRMIST Ramapuram",
    "stack": [
      "Arduino Nano",
      "Relays",
      "Power",
      "Biomedical"
    ],
    "body": [
      "Dental alginate has to be mixed to a uniform consistency before an impression, and doing it by hand makes the result depend on who is holding the spatula. This device takes the hand out of it: a relay-driven vibration motor under the spatula, with automated timing logic so every mix runs for the same interval.",
      "The user side is deliberately plain — LED status indicators for the current state and an LCD for the timer, because this gets used in a clinic, not a lab.",
      "The hardware is battery-powered: a 2S Li-ion pack with BMS protection, voltage monitoring, and a buck converter for the logic rail, so the whole thing is portable."
    ],
    "highlights": [
      "Automated timing logic with LED status and LCD feedback",
      "Relay-driven vibration motor on a battery-powered platform",
      "2S Li-ion pack with BMS protection, voltage monitoring and buck conversion",
      "Built with SRM Dental College and E-Cell, SRMIST Ramapuram"
    ],
    "links": [
      {
        "label": "Repository",
        "href": "https://github.com/madhavkrishnanks/Vibratory_Alginate_Spatula"
      }
    ],
    "media": [
      {
        "src": "images/vibratory-alginate-spatula-01.webp",
        "caption": "Assembled device"
      },
      {
        "src": "images/vibratory-alginate-spatula-02.webp",
        "caption": "Motor, relay and drive circuit"
      },
      {
        "src": "images/vibratory-alginate-spatula-03.webp",
        "caption": "Power section — 18650 cell, buck converter and relay board"
      },
      {
        "src": "images/vibratory-alginate-spatula-04.webp",
        "caption": "Interruption case — buzzer stop reported on the LCD"
      }
    ]
  },
  {
    "slug": "elderzapp",
    "title": "ELDERZAPP — Elder-Friendly Smart Remote",
    "summary": "An ESP8266 that fires IR commands at a TV set-top box, driven by an app built around large buttons, channel logos and a single call-for-help control.",
    "year": "2025",
    "role": "Team — coursework",
    "stack": [
      "ESP8266",
      "IR",
      "IoT",
      "App prototyping"
    ],
    "body": [
      "Set-top box remotes are small, crowded and unforgiving, which makes them hard work for an older user. ELDERZAPP replaces the remote with a phone screen designed for the person actually holding it: large buttons, channel logos instead of numbers, and the four things that get used — channel change, volume, quick call and reminders.",
      "The app is organised the way an older user thinks about their day rather than the way a TV menu is laid out: favourite channels on the home screen, a coming-up-next panel, a one-tap call to a caretaker, plus medicine reminders, a calendar and an alarm alongside the TV controls. An ESP8266 takes the request over Wi-Fi and fires the corresponding IR command at the set-top box, so the television hardware does not change at all."
    ],
    "highlights": [
      "IR control of an existing set-top box over Wi-Fi — no change to the TV or its box",
      "Home screen built from favourite channels and logos, not channel numbers",
      "Quick call to a caretaker, plus reminders, calendar and alarm in the same app",
      "Designed for the person holding it: large targets, few choices per screen"
    ],
    "links": [
      {
        "label": "Project files",
        "href": "https://drive.google.com/drive/folders/15_q8_h7-TOYRPQtNrIQwhEtn99POe371?usp=sharing"
      }
    ],
    "media": [
      {
        "src": "images/elderzapp-01.webp",
        "caption": "Home screen — favourite channels, current time and date, and quick access navigation"
      },
      {
        "src": "images/elderzapp-02.webp",
        "caption": "TV remote interface — high-contrast power, volume and channel controls"
      },
      {
        "src": "images/elderzapp-03.webp",
        "caption": "One-tap call screen — direct voice and video calling for primary contacts"
      },
      {
        "src": "images/elderzapp-04.webp",
        "caption": "Medicine schedule & reminders — daily dosage tracking with completion status"
      },
      {
        "src": "images/elderzapp-05.webp",
        "caption": "Daily calendar & auspicious timings — Rahu Kalam and Yamagandam alerts"
      }
    ]
  },
  {
    "slug": "laser-audio-link",
    "title": "Laser Audio Link",
    "summary": "Voice and music transmitted over a laser beam to a solar panel, then amplified to a speaker — discrete parts on a breadboard.",
    "year": "2025",
    "role": "Team — coursework",
    "stack": [
      "Laser diode",
      "Solar cell",
      "PAM8403",
      "Discrete components"
    ],
    "body": [
      "A deliberately simple optical link: a laser diode as the transmitter, a small solar panel as the receiver, and a PAM8403 audio amplifier driving a speaker at the far end. The audio signal modulates the laser, the panel turns the light back into a voltage, and the amplifier makes it audible. Music from a phone goes in at one end and comes out of the speaker at the other.",
      "Everything sits on a breadboard in discrete components, which is the point — it makes the signal path visible and every loss along it something you can probe. The demonstration that matters is the negative one: putting a hand in the beam cuts the sound instantly, which tells you the link is line-of-sight only and that the receiver is doing no work beyond the light it actually receives."
    ],
    "highlights": [
      "Laser diode transmitter, solar cell receiver, PAM8403 amplifier — all discrete on a breadboard",
      "Music and voice recovered across the room over a free-space optical link",
      "Blocking the beam silences the output — no carrier, no signal"
    ],
    "links": [
      {
        "label": "Project files",
        "href": "https://drive.google.com/drive/folders/1Uet8TSt1e0byd9oerIpVtwRZEZgIq8Iu?usp=sharing"
      }
    ],
    "media": [
      {
        "src": "images/laser-audio-link-01.webp",
        "caption": "Phone feeding audio into the laser transmitter, receiver across the room"
      },
      {
        "src": "images/laser-audio-link-02.webp",
        "caption": "Receiver — solar cell mounted on the speaker, fed from a 9 V supply"
      },
      {
        "src": "images/laser-audio-link-03.webp",
        "caption": "Breaking the beam by hand silences the output — the link is line of sight only"
      }
    ]
  }
];

const EXPERIENCE = [
  {
    "period": "Oct 2025 — Jan 2026",
    "role": "IC Modeling & Validation Intern",
    "org": "FOSSEE, IIT Bombay",
    "place": "Remote",
    "bullets": [
      "Implemented and simulated analog and mixed-signal IC models — op-amps, comparators, regulators, audio amplifiers — in eSim and NGSpice, working from manufacturer datasheets.",
      "Built SPICE subcircuits, schematic symbols and DC / AC / transient test benches from datasheet application circuits to verify each device's key behaviours.",
      "Authored a 56-page technical report covering the modelling, schematic capture and validation of 10+ ICs, including transistor-level subcircuit architecture and the behavioural simulation limits of specialised parts."
    ]
  },
  {
    "period": "Aug 2024 — Present",
    "role": "Undergraduate — Electronics",
    "org": "SRM Institute of Science and Technology, Ramapuram",
    "place": "Chennai",
    "bullets": [
      "75% merit scholarship, awarded on entrance rank and maintained across academic years.",
      "Coursework and projects across embedded systems, analog circuits, hardware protocols and power electronics."
    ]
  }
];

const RECOGNITION = [
  {
    "kind": "Award",
    "date": "Oct 2026",
    "title": "1st place — Research Paper Presentation",
    "org": "MICA 2026, Sri Muthukumaran Institute of Technology",
    "note": "Presented the Smart Assistive Keyboard at a national level symposium on modernisation and innovation in clinical applications."
  },
  {
    "kind": "Award",
    "date": "Oct 2024",
    "title": "2nd place — Ideathon",
    "org": "The Institution of Engineers",
    "note": "Formulated and presented an engineering concept against a real-world problem statement."
  },
  {
    "kind": "Scholarship",
    "date": "Aug 2024",
    "title": "75% Merit Scholarship",
    "org": "SRMIST Ramapuram",
    "note": "Awarded on entrance rank performance and maintained across academic years.",
    "link": null
  },
  {
    "kind": "Report",
    "date": "Jan 2026",
    "title": "Technical report — Designing IC subcircuits in eSim",
    "org": "FOSSEE, IIT Bombay",
    "note": "56 pages on modelling and validating 10+ analog and mixed-signal ICs — NE5532A, MC1495D, LM112, LM12CL, TIP122, TDA2003A, MC1460, MC1408 DAC — with DC sweep, AC response and transient settling test benches.",
    "link": {
      "label": "Read the report",
      "href": "https://static.fossee.in/fossee/reports-2025/Reports-SLI-Autumn-2025/eSim/4%20Madhavkrishnan_K_S_esim_report%20%281%29.pdf"
    }
  },
  {
    "kind": "Certificate",
    "date": "Jan 2026",
    "title": "Semester Long Autumn Internship 2025 — IC design with eSim subcircuits",
    "org": "FOSSEE, IIT Bombay",
    "note": "Internship certificate, ID 35afa.",
    "link": {
      "label": "Credential",
      "href": "https://fossee.in/semester-internship/autumn/2025"
    }
  },
  {
    "kind": "Workshop",
    "date": "Jul 2025",
    "title": "PCB design workshop",
    "org": "E-Groots",
    "note": "Schematic capture in EasyEDA, single and multi-layer layout and routing, design rules, ground and power planes, EMI mitigation, and the path from Gerbers to fabrication."
  },
  {
    "kind": "Workshop",
    "date": "Nov 2024",
    "title": "Electronics Horizon",
    "org": "DIPP Club, SRMIST Ramapuram",
    "note": "Sessions on satellite payload electronics, telemetry, semiconductor trends and embedded architectures."
  },
  {
    "kind": "Hackathons",
    "date": "2026",
    "title": "Smart India Hackathon · Ossome Hacks 3.0 · Fastathon · THREX",
    "org": "MoES / NIOT · MoFPI · SRMIST · Unstop · Gritscape",
    "note": "Two SIH 2026 problem statements taken to a working payload — AQUACHIRP (PS 26058, MoES/NIOT) and REhost (PS 26232, MoFPI) — plus idea and rapid-build rounds at Ossome Hacks 3.0, Fastathon (Team GridNexus) and THREX."
  }
];

const SKILLS = [
  {
    "group": "Hardware",
    "items": [
      {
        "name": "Schematic capture",
        "level": "Intermediate"
      },
      {
        "name": "PCB layout (EasyEDA)",
        "level": "Intermediate"
      },
      {
        "name": "Soldering & rework",
        "level": "Intermediate"
      },
      {
        "name": "Power & battery management",
        "level": "Intermediate"
      }
    ]
  },
  {
    "group": "Analog & signal",
    "items": [
      {
        "name": "SPICE — eSim / NGSpice",
        "level": "Advanced"
      },
      {
        "name": "LTspice",
        "level": "Intermediate"
      },
      {
        "name": "Waveform synthesis",
        "level": "Intermediate"
      },
      {
        "name": "Acoustic propagation models",
        "level": "Working"
      }
    ]
  },
  {
    "group": "Embedded",
    "items": [
      {
        "name": "MicroPython / CircuitPython",
        "level": "Advanced"
      },
      {
        "name": "Embedded C — STM32",
        "level": "Intermediate"
      },
      {
        "name": "Timer + DMA streaming",
        "level": "Intermediate"
      },
      {
        "name": "FreeRTOS",
        "level": "Working"
      }
    ]
  },
  {
    "group": "Protocols",
    "items": [
      {
        "name": "SPI",
        "level": "Advanced"
      },
      {
        "name": "I2C",
        "level": "Advanced"
      },
      {
        "name": "UART",
        "level": "Advanced"
      },
      {
        "name": "USB HID · MQTT",
        "level": "Intermediate"
      }
    ]
  },
  {
    "group": "Test & tools",
    "items": [
      {
        "name": "Logic analyser / PulseView",
        "level": "Advanced"
      },
      {
        "name": "Oscilloscope",
        "level": "Intermediate"
      },
      {
        "name": "Python",
        "level": "Advanced"
      },
      {
        "name": "Git & GitHub",
        "level": "Intermediate"
      }
    ]
  }
];

const ABOUT = {
  "paragraphs": [
    "I am an electronics undergraduate at SRM Institute of Science and Technology, Ramapuram. Most of what I know came from taking a protocol apart until it stopped being magic — I have spent the last year writing I2C and SPI masters in Python on an FT232R just to watch the transactions on a logic analyser, then rebuilding the same buses properly on an STM32.",
    "I spent a semester at FOSSEE, IIT Bombay modelling analog and mixed-signal ICs in eSim and NGSpice against manufacturer datasheets, which is where I learned to read a datasheet as a specification rather than a reference. I am looking for hardware or embedded internship work where the board actually has to run."
  ],
  "now": [
    {
      "label": "Building",
      "value": "Smart Assistive Keyboard — Pico W, USB HID, 2S Li-ion"
    },
    {
      "label": "Learning",
      "value": "STM32 peripheral bring-up at register level"
    },
    {
      "label": "Looking for",
      "value": "Hardware / embedded internship"
    }
  ]
};

const CUSTOM_SECTIONS = [
  {
    "id": "board-exploration",
    "title": "Board Exploration",
    "subtitle": "Hands-on teardowns, circuit bring-up, and hardware experiments",
    "items": [
      {
        "title": "STM32F103 Minimal System Bring-Up",
        "date": "2026",
        "summary": "Analyzing power rail ripple, crystal oscillation stability, and SWD programming pinouts on the bench.",
        "tags": [
          "STM32",
          "Hardware Bring-Up",
          "Oscilloscope"
        ],
        "media": [],
        "link": null
      }
    ]
  }
];

if (typeof window !== "undefined") {
  window.PROFILE = PROFILE;
  window.PROJECTS = PROJECTS;
  window.EXPERIENCE = EXPERIENCE;
  window.RECOGNITION = RECOGNITION;
  window.SKILLS = SKILLS;
  window.ABOUT = ABOUT;
  window.CUSTOM_SECTIONS = CUSTOM_SECTIONS;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PROFILE, PROJECTS, EXPERIENCE, RECOGNITION, SKILLS, ABOUT, CUSTOM_SECTIONS };
}
