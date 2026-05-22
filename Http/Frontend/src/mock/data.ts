export const MOCK_PLAYER = { name: 'Liora Veil', world: 'Chocobo' };

export const MOCK_CHANNELS = {
  type: 'channels',
  channels: [
    { label: 'Say', shortLabel: 'Say', prefix: '/s ' },
    { label: 'Shout', shortLabel: 'Sh', prefix: '/sh ' },
    { label: 'Yell', shortLabel: 'Yell', prefix: '/y ' },
    { label: 'Party', shortLabel: 'Pty', prefix: '/p ' },
    { label: 'Alliance', shortLabel: 'Ally', prefix: '/a ' },
    { label: 'Free Company', shortLabel: 'FC', prefix: '/fc ' },
    { label: 'LS1: Starbound', shortLabel: 'LS1', prefix: '/l1 ' },
    { label: 'CWLS1: World Travelers', shortLabel: 'CW1', prefix: '/cw1 ' },
    { label: 'Novice Network', shortLabel: 'NN', prefix: '/n ' },
  ],
};

const ALL_CHANNELS = [10, 11, 12, 13, 14, 15, 16, 24, 27, 28, 29, 30, 37, 56, 57, 61, 62];

export const MOCK_SETTINGS = {
  fontFamily: 'Inter',
  fontSize: 14,
  italicizeSystem: true,
  useColoredBackground: false,
  largeLinkPreviews: false,
  disabledChannels: [],
  trustedDomains: [],
  filters: [
    {
      name: 'General',
      showChannelTypes: ALL_CHANNELS,
      defaultSendPrefix: null,
      notifyUnread: false,
    },
    {
      name: 'The-Crew',
      showChannelTypes: [10, 14, 15, 24],
      defaultSendPrefix: null,
      notifyUnread: true,
    },
    { name: 'Static', showChannelTypes: [14], defaultSendPrefix: '/p ', notifyUnread: true },
    { name: 'FC', showChannelTypes: [24], defaultSendPrefix: '/fc ', notifyUnread: true },
    { name: 'Hunt-Train', showChannelTypes: [11, 30], defaultSendPrefix: null, notifyUnread: true },
    {
      name: 'Social',
      showChannelTypes: [10, 11, 30, 28, 29],
      defaultSendPrefix: null,
      notifyUnread: false,
    },
  ],
  folders: [
    { name: 'FILTERS', filters: ['General', 'The-Crew', 'Static'] },
    { name: 'COMMUNITY', filters: ['FC', 'Hunt-Train', 'Social'] },
  ],
};

export const MOCK_FILTER_MODE = {
  characterKey: `${MOCK_PLAYER.name}@${MOCK_PLAYER.world}`,
  isPersonal: false,
  hasExistingFile: false,
  personalFilterCharacters: ['Baldur Grimstone@Gungnir', 'Finn Ashwood@Gungnir'],
};

export const MOCK_CHARACTERS = [
  {
    key: 'Baldur Grimstone@Gungnir',
    filters: [
      {
        name: 'General',
        showChannelTypes: ALL_CHANNELS,
        defaultSendPrefix: null,
        notifyUnread: false,
      },
      { name: 'Static', showChannelTypes: [14], defaultSendPrefix: '/p ', notifyUnread: true },
      { name: 'FC', showChannelTypes: [24], defaultSendPrefix: '/fc ', notifyUnread: true },
    ],
    folders: [{ name: 'Main', filters: ['General', 'Static', 'FC'] }],
  },
  {
    key: 'Finn Ashwood@Gungnir',
    filters: [
      {
        name: 'General',
        showChannelTypes: ALL_CHANNELS,
        defaultSendPrefix: null,
        notifyUnread: false,
      },
      { name: 'Static', showChannelTypes: [14], defaultSendPrefix: '/p ', notifyUnread: true },
      {
        name: 'The-Crew',
        showChannelTypes: [10, 14, 15, 24],
        defaultSendPrefix: null,
        notifyUnread: true,
      },
    ],
    folders: [
      { name: 'FILTERS', filters: ['General', 'Static'] },
      { name: 'SOCIAL', filters: ['The-Crew'] },
    ],
  },
];

const LOCAL = MOCK_PLAYER.name;
const WORLD = MOCK_PLAYER.world;
const now = Date.now();
const t = (minutesAgo: number) => now - minutesAgo * 60000;
const text = (s: string) => [{ Type: 'text', Text: s }];
const at = (s: string) => [
  { Type: 'icon' as const, IconId: 54 },
  { Type: 'text' as const, Text: s },
  { Type: 'icon' as const, IconId: 55 },
];

export const MOCK_PLAYER_AVATAR_URL =
  'https://img2.finalfantasyxiv.com/f/947c220d2d85889cf4681679a08135e9_781d6b3603312f6be41670afa37282e0fc0.jpg?1778724831';

export const MOCK_AVATAR_POOL = [
  'https://img2.finalfantasyxiv.com/f/563409868c65105a64a2f44236872ff5_3ea38e723c590aabf186367e1eb7e6a1fc0.jpg?1778724164',
  'https://img2.finalfantasyxiv.com/f/3c5b45f7b3752050a75809754fbdcc48_4a92c619bde4f34cfa77e05fef21ad85fc0.jpg?1778723989',
  'https://img2.finalfantasyxiv.com/f/8f5af6e2695eaa7e1509f53b240b345d_7126768d768f6c6c7fed3eaee98c3a8afc0.jpg?1778723667',
  'https://img2.finalfantasyxiv.com/f/647a31acf1cd400582311176b39d8515_87b7d447f40b06dfc7228caf195f7dcffc0.jpg?1778723518',
  'https://img2.finalfantasyxiv.com/f/f269b7d7391fbef99fe37af529bebe80_3ea38e723c590aabf186367e1eb7e6a1fc0.jpg?1778723514',
  'https://img2.finalfantasyxiv.com/f/74ace3fc8e8d491fa4d1bd553f8539b1_8f82f937943b6baf4c565020d5eba0ccfc0.jpg?1778723400',
  'https://img2.finalfantasyxiv.com/f/328493cb99e33556a6fdc15681409faa_87b7d447f40b06dfc7228caf195f7dcffc0.jpg?1778723387',
  'https://img2.finalfantasyxiv.com/f/959cf79248fce3f52f146c125a4567c4_e2bb3f9679fec6d4836fcf8abcc3eeacfc0.jpg?1778723372',
  'https://img2.finalfantasyxiv.com/f/9e26296bd2c8ab9e815d0dc4b6da9633_b7a71d8799cf6dd75b711a7f52de6675fc0.jpg?1778723309',
  'https://img2.finalfantasyxiv.com/f/b1f9e8a98fe358a955987faff0e48d72_b7a71d8799cf6dd75b711a7f52de6675fc0.jpg?1778723230',
  'https://img2.finalfantasyxiv.com/f/e0d53e695df86c45bdd9414647257401_470db1bf2e865f9130531fea40b61ee4fc0.jpg?1778722865',
  'https://img2.finalfantasyxiv.com/f/6dbcc878f13ccacfcfc6b5fe8aef54a3_4a92c619bde4f34cfa77e05fef21ad85fc0.jpg?1778722837',
  'https://img2.finalfantasyxiv.com/f/b5cbdbe8dd3655b2c3c19c2731b4e352_3ea38e723c590aabf186367e1eb7e6a1fc0.jpg?1778722835',
  'https://img2.finalfantasyxiv.com/f/d70d23a2c76a71ca32741ed8a7badf6a_cf768a751b1f5e355c2fd39a9ed91f3ffc0.jpg?1778722651',
  'https://img2.finalfantasyxiv.com/f/e1f43ce4c6e850d6814381f0cc151845_7bb6b1e488f0e4f01c5314d010b60f31fc0.jpg?1778722774',
  'https://img2.finalfantasyxiv.com/f/baccea628dc6019abc41d2def6d3c31a_3ea38e723c590aabf186367e1eb7e6a1fc0.jpg?1778722432',
];

export function getAvatarForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return MOCK_AVATAR_POOL[hash % MOCK_AVATAR_POOL.length];
}

export const MOCK_MESSAGES = [
  // Pre-dungeon chatter in Say
  {
    Type: 10,
    SenderName: 'Caelum Arke',
    SenderWorld: 'Carbuncle',
    MessagePayloads: text('anyone done the new unreal yet? is it actually that hard'),
    Timestamp: t(22),
  },
  {
    Type: 10,
    SenderName: LOCAL,
    SenderWorld: WORLD,
    MessagePayloads: text("cleared it last week, took us like 4 hours but it's really fun"),
    Timestamp: t(21),
  },
  // Shout
  {
    Type: 11,
    SenderName: 'Nael Orenthal',
    SenderWorld: 'Phantom',
    MessagePayloads: text('LFM P12S prog, need 1 healer — must know phase 1'),
    Timestamp: t(18),
  },
  // CWLS coordination
  {
    Type: 37,
    SenderName: 'Thalise Maron',
    SenderWorld: 'Gungnir',
    MessagePayloads: text('who is on for hunt train tonight? fairy b in 30'),
    Timestamp: t(15),
  },
  {
    Type: 37,
    SenderName: 'Finn Ashwood',
    SenderWorld: 'Gungnir',
    MessagePayloads: text("I'll come after reclears, might be a bit late"),
    Timestamp: t(14),
  },
  // Static party sequence
  {
    Type: 14,
    SenderName: LOCAL,
    SenderWorld: WORLD,
    MessagePayloads: text(
      'lol finally. ok strats: Baldur takes the boss north, Finn and I spread east/west on the first AOE',
    ),
    Timestamp: t(12),
  },
  {
    Type: 14,
    SenderName: 'Baldur Grimstone',
    SenderWorld: 'Gungnir',
    MessagePayloads: at('Got it!'),
    Timestamp: t(11),
  },
  {
    Type: 14,
    SenderName: 'Finn Ashwood',
    SenderWorld: 'Gungnir',
    MessagePayloads: at('Got it!'),
    Timestamp: t(11),
  },
  {
    Type: 14,
    SenderName: LOCAL,
    SenderWorld: WORLD,
    MessagePayloads: text(
      "wait Finn your auto-translate said 'Got it' not 'On my way' — stack on me for the tankbuster",
    ),
    Timestamp: t(10),
  },
  {
    Type: 14,
    SenderName: 'Finn Ashwood',
    SenderWorld: 'Gungnir',
    MessagePayloads: at('Oops!'),
    Timestamp: t(9),
  },
  {
    Type: 14,
    SenderName: 'Baldur Grimstone',
    SenderWorld: 'Gungnir',
    MessagePayloads: text('someone toss a Phoenix Down lol'),
    Timestamp: t(8),
  },
  // FC spectating
  {
    Type: 24,
    SenderName: 'Thalise Maron',
    SenderWorld: WORLD,
    MessagePayloads: text('lmaooo watching from the FC room, gl in there!!!'),
    Timestamp: t(8),
  },
  // Back to party
  {
    Type: 14,
    SenderName: LOCAL,
    SenderWorld: WORLD,
    MessagePayloads: text('THIS IS FINE. ok from the top'),
    Timestamp: t(7),
  },
  // Post-clear LS
  {
    Type: 16,
    SenderName: 'Caelum Arke',
    SenderWorld: 'Carbuncle',
    MessagePayloads: text(
      'hey did you guys see this? https://na.finalfantasyxiv.com/lodestone/topics/detail/07320affa7e0fcd9685afcbe54fbf55405b6d822/',
    ),
    Timestamp: t(4),
  },
  // Tell incoming from static member
  {
    Type: 13,
    SenderName: 'Finn Ashwood',
    SenderWorld: 'Gungnir',
    MessagePayloads: [
      { Type: 'text' as const, Text: 'heyyy!! ' },
      ...at('Anabaseios: The Twelfth Circle (Savage)'),
      {
        Type: 'text' as const,
        Text: ' tonight, 5 slot just opened — you down? prog P3 every week ',
      },
    ],
    Timestamp: t(3),
  },
  // Tell outgoing
  {
    Type: 12,
    SenderName: LOCAL,
    SenderWorld: WORLD,
    RecipientName: 'Finn Ashwood',
    RecipientWorld: 'Gungnir',
    MessagePayloads: text('yes omg, same time as usual?'),
    Timestamp: t(2),
  },
  // Celebration in say
  {
    Type: 10,
    SenderName: LOCAL,
    SenderWorld: WORLD,
    MessagePayloads: text('we did it!! gg everyone'),
    Timestamp: t(1),
  },
  // Emote logs post-clear
  {
    Type: 29,
    SenderName: LOCAL,
    SenderWorld: WORLD,
    MessagePayloads: text('Liora Veil cheers!'),
    Timestamp: t(0),
  },
  {
    Type: 29,
    SenderName: 'Finn Ashwood',
    SenderWorld: 'Gungnir',
    MessagePayloads: text('Finn Ashwood jubilates with Liora Veil!'),
    Timestamp: t(0),
  },
  {
    Type: 29,
    SenderName: 'Baldur Grimstone',
    SenderWorld: 'Gungnir',
    MessagePayloads: text('Baldur Grimstone performs a victory pose.'),
    Timestamp: t(0),
  },
];
