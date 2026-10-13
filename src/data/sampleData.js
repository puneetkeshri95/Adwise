export const kpiData = [
  { label: 'Revenue', value: '₹2,34,653', delta: '↑ 18%', deltaLabel: 'vs last period', up: true, sparkline: [18, 22, 19, 25, 28, 30, 27, 34, 38, 35, 40, 42] },
  { label: 'Ad Spend', value: '₹41,200', delta: '↑ 9%', deltaLabel: 'vs last period', up: false, sparkline: [12, 14, 13, 15, 16, 15, 17, 18, 19, 18, 20, 19] },
  { label: 'ROAS', value: '5.69x', delta: '↑ 0.4x', deltaLabel: 'vs last period', up: true, sparkline: [4.2, 4.5, 4.8, 5.0, 5.2, 5.1, 5.4, 5.6, 5.3, 5.5, 5.7, 5.69] },
  { label: 'CPA', value: '₹471', delta: '↓ 12%', deltaLabel: 'vs last period', up: true, sparkline: [580, 560, 540, 520, 510, 500, 490, 485, 480, 475, 472, 471] },
  { label: 'Conversions', value: '87', delta: '↑ 22', deltaLabel: 'vs last period', up: true, sparkline: [3, 5, 4, 6, 7, 5, 8, 9, 7, 10, 12, 11] },
  { label: 'Unique Visitors', value: '6,841', delta: '↑ 11%', deltaLabel: 'vs last period', up: true, sparkline: [300, 350, 380, 400, 420, 450, 470, 500, 520, 550, 580, 600] },
];

export const alerts = [
  { id: 'alert1', text: 'Ad "Fresher Hook v2" has spent ₹3,200 with 0 conversions in 48 hrs', severity: 'high', adId: 'a3' },
  { id: 'alert2', text: 'AI Mastery – Retargeting ROAS dropped 41% vs last week', severity: 'medium', campaignId: 'c2' },
];

export const campaignData = [
  {
    id: 'c1', type: 'campaign', name: 'AI Mastery Workshop – TOF', status: 'on',
    spend: 18400, revenue: 112300, roas: 6.1, cpa: 388, conv: 47, assisted: 12, cpm: 210, ctr: 2.8, epm: 1287,
    budgetUsed: 72,
    children: [
      {
        id: 'as1', type: 'adset', name: 'Interest: AI & Tech (25–40)', status: 'on',
        spend: 9800, revenue: 64200, roas: 6.55, cpa: 362, conv: 27, assisted: 7, cpm: 198, ctr: 3.1, epm: 1298,
        children: [
          { id: 'a1', type: 'ad', name: 'Testimonial carousel – Priya S.', status: 'on', spend: 4200, revenue: 31000, roas: 7.38, cpa: 311, conv: 13, assisted: 4, cpm: 185, ctr: 3.4, epm: 1369, first: '38%', last: '29%', avgPosition: 1.4 },
          { id: 'a2', type: 'ad', name: 'Hook video – "Replace yourself with AI"', status: 'on', spend: 3100, revenue: 19800, roas: 6.39, cpa: 393, conv: 9, assisted: 2, cpm: 202, ctr: 2.9, epm: 1292, first: '44%', last: '18%', avgPosition: 1.2 },
          { id: 'a3', type: 'ad', name: 'Fresher Hook v2', status: 'on', spend: 2500, revenue: 0, roas: 0, cpa: '-', conv: 0, assisted: 1, cpm: 220, ctr: 1.8, epm: 0, first: '0%', last: '0%', avgPosition: '-' },
        ]
      },
      {
        id: 'as2', type: 'adset', name: 'Lookalike 2% – Past purchasers', status: 'on',
        spend: 8600, revenue: 48100, roas: 5.59, cpa: 421, conv: 20, assisted: 5, cpm: 224, ctr: 2.5, epm: 1253,
        children: [
          { id: 'a4', type: 'ad', name: 'UGC style – "I learned in 2 hours"', status: 'on', spend: 5100, revenue: 31200, roas: 6.12, cpa: 390, conv: 13, assisted: 3, cpm: 215, ctr: 2.7, epm: 1314, first: '22%', last: '41%', avgPosition: 2.1 },
          { id: 'a5', type: 'ad', name: 'Static – workshop screenshot', status: 'off', spend: 3500, revenue: 16900, roas: 4.83, cpa: 466, conv: 7, assisted: 2, cpm: 234, ctr: 2.2, epm: 1133, first: '18%', last: '33%', avgPosition: 1.8 },
        ]
      }
    ]
  },
  {
    id: 'c2', type: 'campaign', name: 'AI Mastery Workshop – Retargeting', status: 'on',
    spend: 14800, revenue: 72200, roas: 4.88, cpa: 589, conv: 25, assisted: 31, cpm: 310, ctr: 1.9, epm: 1513,
    budgetUsed: 88,
    children: [
      {
        id: 'as3', type: 'adset', name: 'Visited LP, no purchase – 7 days', status: 'on',
        spend: 9200, revenue: 48600, roas: 5.28, cpa: 543, conv: 17, assisted: 19, cpm: 290, ctr: 2.1, epm: 1531,
        children: [
          { id: 'a6', type: 'ad', name: 'Objection handler – "Is it worth it?"', status: 'on', spend: 5400, revenue: 30100, roas: 5.57, cpa: 516, conv: 10, assisted: 11, cpm: 278, ctr: 2.3, epm: 1553, first: '8%', last: '62%', avgPosition: 2.8 },
          { id: 'a7', type: 'ad', name: 'Scarcity – seats closing', status: 'on', spend: 3800, revenue: 18500, roas: 4.87, cpa: 581, conv: 7, assisted: 8, cpm: 304, ctr: 1.9, epm: 1475, first: '5%', last: '71%', avgPosition: 3.1 },
        ]
      },
      {
        id: 'as4', type: 'adset', name: 'Visited checkout, no purchase', status: 'on',
        spend: 5600, revenue: 23600, roas: 4.21, cpa: 700, conv: 8, assisted: 12, cpm: 342, ctr: 1.6, epm: 1440,
        children: [
          { id: 'a8', type: 'ad', name: 'Discount – ₹47 offer ending', status: 'on', spend: 5600, revenue: 23600, roas: 4.21, cpa: 700, conv: 8, assisted: 12, cpm: 342, ctr: 1.6, epm: 1440, first: '3%', last: '79%', avgPosition: 3.5 },
        ]
      }
    ]
  },
  {
    id: 'c3', type: 'campaign', name: 'Speed Reading Masterclass – TOF', status: 'off',
    spend: 8000, revenue: 50153, roas: 6.27, cpa: 533, conv: 15, assisted: 8, cpm: 180, ctr: 3.2, epm: 1129,
    budgetUsed: 0,
    children: []
  }
];

export const conversionDetails = {
  a1: [
    { name: 'Ananya Sharma', email: 'ananya@gmail.com', orderId: 'RP-20260415-1132', amount: '₹47', time: 'Apr 15, 11:32am', device: 'iPhone 15', journey: [
      { ad: 'Testimonial carousel – Priya S.', date: 'Apr 10, 9:14am', device: 'iPhone 15', type: 'first' },
      { ad: 'AI Mastery – Retargeting', date: 'Apr 14, 2:45pm', device: 'MacBook', type: 'middle' },
      { ad: 'Discount – ₹47 offer ending', date: 'Apr 15, 11:20am', device: 'iPhone 15', type: 'last' },
    ]},
    { name: 'Rohan Mehta', email: 'rohan.m@outlook.com', orderId: 'RP-20260416-1514', amount: '₹47', time: 'Apr 16, 3:14pm', device: 'Samsung S24', journey: [
      { ad: 'Testimonial carousel – Priya S.', date: 'Apr 12, 10:05am', device: 'Samsung S24', type: 'first' },
      { ad: 'Objection handler – "Is it worth it?"', date: 'Apr 16, 3:00pm', device: 'Samsung S24', type: 'last' },
    ]},
    { name: 'Priya Desai', email: 'priya.d@yahoo.com', orderId: 'RP-20260414-0901', amount: '₹47', time: 'Apr 14, 9:01am', device: 'Pixel 8', journey: [
      { ad: 'Testimonial carousel – Priya S.', date: 'Apr 8, 4:30pm', device: 'Pixel 8', type: 'first' },
      { ad: 'Hook video – "Replace yourself with AI"', date: 'Apr 11, 11:15am', device: 'Windows Laptop', type: 'middle' },
      { ad: 'Scarcity – seats closing', date: 'Apr 13, 8:22pm', device: 'Pixel 8', type: 'middle' },
      { ad: 'Discount – ₹47 offer ending', date: 'Apr 14, 8:55am', device: 'Pixel 8', type: 'last' },
    ]},
  ],
  a2: [
    { name: 'Vikram Singh', email: 'vikram.s@gmail.com', orderId: 'RP-20260413-1423', amount: '₹47', time: 'Apr 13, 2:23pm', device: 'iPhone 14 Pro', journey: [
      { ad: 'Hook video – "Replace yourself with AI"', date: 'Apr 9, 5:10pm', device: 'iPhone 14 Pro', type: 'first' },
      { ad: 'Testimonial carousel – Priya S.', date: 'Apr 12, 10:30am', device: 'MacBook Air', type: 'middle' },
      { ad: 'Discount – ₹47 offer ending', date: 'Apr 13, 2:15pm', device: 'iPhone 14 Pro', type: 'last' },
    ]},
  ],
  a4: [
    { name: 'Kavya Nair', email: 'kavya.n@gmail.com', orderId: 'RP-20260416-1045', amount: '₹47', time: 'Apr 16, 10:45am', device: 'OnePlus 12', journey: [
      { ad: 'UGC style – "I learned in 2 hours"', date: 'Apr 11, 3:20pm', device: 'OnePlus 12', type: 'first' },
      { ad: 'Objection handler – "Is it worth it?"', date: 'Apr 15, 7:30pm', device: 'Windows Laptop', type: 'middle' },
      { ad: 'Scarcity – seats closing', date: 'Apr 16, 10:30am', device: 'OnePlus 12', type: 'last' },
    ]},
  ],
  a6: [
    { name: 'Arjun Patel', email: 'arjun.p@gmail.com', orderId: 'RP-20260415-1820', amount: '₹47', time: 'Apr 15, 6:20pm', device: 'iPhone 15 Pro', journey: [
      { ad: 'Testimonial carousel – Priya S.', date: 'Apr 7, 11:00am', device: 'iPhone 15 Pro', type: 'first' },
      { ad: 'Hook video – "Replace yourself with AI"', date: 'Apr 10, 4:45pm', device: 'iPad', type: 'middle' },
      { ad: 'Objection handler – "Is it worth it?"', date: 'Apr 15, 6:10pm', device: 'iPhone 15 Pro', type: 'last' },
    ]},
  ],
  a7: [
    { name: 'Neha Gupta', email: 'neha.g@outlook.com', orderId: 'RP-20260417-0830', amount: '₹47', time: 'Apr 17, 8:30am', device: 'Samsung A54', journey: [
      { ad: 'UGC style – "I learned in 2 hours"', date: 'Apr 12, 1:15pm', device: 'Samsung A54', type: 'first' },
      { ad: 'Scarcity – seats closing', date: 'Apr 17, 8:20am', device: 'Samsung A54', type: 'last' },
    ]},
  ],
  a8: [
    { name: 'Deepak Kumar', email: 'deepak.k@gmail.com', orderId: 'RP-20260416-2100', amount: '₹47', time: 'Apr 16, 9:00pm', device: 'Redmi Note 13', journey: [
      { ad: 'Hook video – "Replace yourself with AI"', date: 'Apr 10, 2:00pm', device: 'Redmi Note 13', type: 'first' },
      { ad: 'Testimonial carousel – Priya S.', date: 'Apr 13, 11:30am', device: 'Windows Laptop', type: 'middle' },
      { ad: 'Objection handler – "Is it worth it?"', date: 'Apr 15, 5:45pm', device: 'Redmi Note 13', type: 'middle' },
      { ad: 'Discount – ₹47 offer ending', date: 'Apr 16, 8:50pm', device: 'Redmi Note 13', type: 'last' },
    ]},
  ],
};

export const journeyPaths = [
  { path: ['TOF – Testimonial', 'Retargeting – Objection', 'Purchase'], count: 18, value: 846 },
  { path: ['TOF – Hook Video', 'Retargeting – Scarcity', 'Purchase'], count: 12, value: 564 },
  { path: ['TOF – UGC', 'Retargeting – Discount', 'Purchase'], count: 15, value: 705 },
  { path: ['TOF – Testimonial', 'Retargeting – Discount', 'Purchase'], count: 10, value: 470 },
  { path: ['TOF – Hook Video', 'Page Visit', 'Drop-off'], count: 45, value: 0 },
  { path: ['TOF – UGC', 'Page Visit', 'Drop-off'], count: 38, value: 0 },
  { path: ['TOF – Testimonial', 'Page Visit', 'Checkout', 'Drop-off'], count: 22, value: 0 },
  { path: ['TOF – Hook Video', 'Page Visit', 'Checkout', 'Purchase'], count: 8, value: 376 },
  { path: ['Direct', 'Page Visit', 'Purchase'], count: 5, value: 235 },
  { path: ['Organic Search', 'Page Visit', 'Checkout', 'Purchase'], count: 3, value: 141 },
];

export const visitorData = [
  { id: 'v001', name: 'Ananya Sharma', email: 'ananya@gmail.com', visits: 4, lastVisit: 'Apr 15, 2026', converted: true, totalSpent: '₹47', source: 'Meta Ads' },
  { id: 'v002', name: 'Rohan Mehta', email: 'rohan.m@outlook.com', visits: 2, lastVisit: 'Apr 16, 2026', converted: true, totalSpent: '₹47', source: 'Meta Ads' },
  { id: 'v003', name: 'Priya Desai', email: 'priya.d@yahoo.com', visits: 5, lastVisit: 'Apr 14, 2026', converted: true, totalSpent: '₹47', source: 'Meta Ads' },
  { id: 'v004', name: 'Visitor #2841', email: '-', visits: 3, lastVisit: 'Apr 17, 2026', converted: false, totalSpent: '-', source: 'Meta Ads' },
  { id: 'v005', name: 'Visitor #3912', email: '-', visits: 1, lastVisit: 'Apr 16, 2026', converted: false, totalSpent: '-', source: 'Organic' },
  { id: 'v006', name: 'Vikram Singh', email: 'vikram.s@gmail.com', visits: 3, lastVisit: 'Apr 13, 2026', converted: true, totalSpent: '₹47', source: 'Meta Ads' },
  { id: 'v007', name: 'Kavya Nair', email: 'kavya.n@gmail.com', visits: 3, lastVisit: 'Apr 16, 2026', converted: true, totalSpent: '₹47', source: 'Meta Ads' },
  { id: 'v008', name: 'Visitor #5120', email: '-', visits: 2, lastVisit: 'Apr 15, 2026', converted: false, totalSpent: '-', source: 'Meta Ads' },
];
