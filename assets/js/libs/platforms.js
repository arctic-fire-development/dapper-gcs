var sitlCopterParams = [
  ["FRAME","0"  ],
  ["MAG_ENABLE","1"  ],
  ["FS_THR_ENABLE","1"  ],
  ["BATT_MONITOR","4"  ],
  ["CH7_OPT","7"  ],
  ["COMPASS_LEARN","0"  ],
  ["COMPASS_OFS_X","5"  ],
  ["COMPASS_OFS_Y","13"  ],
  ["COMPASS_OFS_Z","-18"  ],
  ["RC1_MAX","2000"  ],
  ["RC1_MIN","1000"  ],
  ["RC1_TRIM","1500"  ],
  ["RC2_MAX","2000"  ],
  ["RC2_MIN","1000"  ],
  ["RC2_TRIM","1500"  ],
  ["RC3_MAX","2000"  ],
  ["RC3_MIN","1000"  ],
  ["RC3_TRIM","1500"  ],
  ["RC4_MAX","2000"  ],
  ["RC4_MIN","1000"  ],
  ["RC4_TRIM","1500"  ],
  ["RC5_MAX","2000"  ],
  ["RC5_MIN","1000"  ],
  ["RC5_TRIM","1500"  ],
  ["RC6_MAX","2000"  ],
  ["RC6_MIN","1000"  ],
  ["RC6_TRIM","1500"  ],
  ["RC7_MAX","2000"  ],
  ["RC7_MIN","1000"  ],
  ["RC7_TRIM","1500"  ],
  ["RC8_MAX","2000"  ],
  ["RC8_MIN","1000"  ],
  ["RC8_TRIM","1500"  ],
  ["FLTMODE1","7"  ],
  ["FLTMODE2","9"  ],
  ["FLTMODE3","6"  ],
  ["FLTMODE4","3"  ],
  ["FLTMODE5","5"  ],
  ["FLTMODE6","0"  ],
  ["SUPER_SIMPLE","0"  ],
  ["SIM_GPS_DELAY","2"  ],
  ["SIM_ACC_RND","0"  ],
  ["SIM_GYR_RND","0"  ],
  ["SIM_WIND_SPD","0"  ],
  ["SIM_WIND_TURB","0"  ],
  ["SIM_BARO_RND","0"  ],
  ["SIM_MAG_RND","0"  ],
  ["ARMING_CHECK", "0" ]
];

var platforms = [
  {
    name: 'ArduPlane (Generic)',
    type: 'plane',
    payloads: [],
    missions: ['SITL'],
    id: 0
  },
  {
    name: 'ArduCopter (Generic)',
    type: 'copter',
    payloads: [],
    missions: ['SITL', 'Free Flight'],
    id: 1,
    parameters: sitlCopterParams
  },
  {
    name: '3DR Iris',
    type: 'quadcopter',
    payloads: ['GoPro'],
    missions: ['SITL', 'Free Flight'],
    id: 2,
    defaults: {
      topSpeed: 10 // mph
    }
  }
];

module.exports = platforms;