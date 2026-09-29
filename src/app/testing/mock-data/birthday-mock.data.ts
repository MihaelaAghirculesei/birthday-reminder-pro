import { getZodiacSign } from '../../shared';
import { type Birthday } from '../../shared/models/birthday.model';

export interface MockBirthdayData {
  name: string;
  date: string;
  category: string;
  photo: string | null;
  notes: string;
  email?: string;
  phone?: string;
  telegramUsername?: string;
}

export const MOCK_BIRTHDAY_RAW_DATA: MockBirthdayData[] = [
  { name: 'Uwe Müller', date: '1990-03-15', category: 'family', photo: 'https://i.pravatar.cc/200?img=1', notes: 'Loves fantasy novels, coffee enthusiast, collects vinyl records', email: 'uwe.mueller@example.com', phone: '+49 170 1234567' },
  { name: 'Bob Smith', date: '1985-06-22', category: 'friends', photo: 'https://i.pravatar.cc/200?img=12', notes: 'Photography enthusiast, shoots with Canon gear, favourite colour blue', email: 'bob.smith@example.com' },
  { name: 'Carlo Bruns', date: '1992-09-10', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=13', notes: 'Gym fanatic, into protein supplements, Marvel movie fan' },
  { name: 'Diana Werner', date: '1988-12-05', category: 'friends', photo: 'https://i.pravatar.cc/200?img=5', notes: 'Plays guitar, rock music fan, follows Formula 1', telegramUsername: 'diana_w' },
  { name: 'Eduard Neumann', date: '1995-02-28', category: 'family', photo: 'https://i.pravatar.cc/200?img=14', notes: 'Keen gardener, prefers succulents, allergic to cats' },
  { name: 'Fiona Bauer', date: '1987-07-18', category: 'romantic', photo: 'https://i.pravatar.cc/200?img=9', notes: 'Yoga instructor, loves organic tea, uses meditation apps, gluten-free diet', email: 'fiona.bauer@example.com', phone: '+44 7700 900123', telegramUsername: 'fiona_yoga' },
  { name: 'Georg Maier', date: '1993-10-03', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=15', notes: 'Builds gaming PCs, plays FPS games, favourite: Call of Duty' },
  { name: 'Hanna Mayer', date: '1991-04-12', category: 'friends', photo: 'https://i.pravatar.cc/200?img=10', notes: 'Vegetarian, loves Italian food, enjoys white wine', phone: '+1 555 0199' },
  { name: 'Isabella Garcia', date: '1994-01-08', category: 'family', photo: 'https://i.pravatar.cc/200?img=16', notes: 'Into fashion, size S, prefers a minimalist style', email: 'isabella.garcia@example.com' },
  { name: 'Jack Thompson', date: '1989-05-19', category: 'acquaintances', photo: 'https://i.pravatar.cc/200?img=17', notes: 'Tech enthusiast, uses an iPhone 15, wants AirPods Pro', email: 'jack.t@example.com', telegramUsername: 'jacktech' },
  { name: 'Katherine Lee', date: '1996-08-25', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=20', notes: 'Works in finance, lives in London, has 1 dog' },
  { name: 'Liam O\'Connor', date: '1986-11-14', category: 'friends', photo: 'https://i.pravatar.cc/200?img=33', notes: 'Law student, runs on energy drinks, night owl' },
  { name: 'Maya Patel', date: '1993-02-28', category: 'family', photo: 'https://i.pravatar.cc/200?img=21', notes: 'Moved to New York, learning Spanish, loves hiking', email: 'maya.patel@example.com' },
  { name: 'Olivia Martinez', date: '1997-10-21', category: 'friends', photo: 'https://i.pravatar.cc/200?img=47', notes: 'Software developer, mechanical keyboard fan, plays chess online', telegramUsername: 'olivia_dev' },
  { name: 'Patrick Anderson', date: '1984-02-16', category: 'acquaintances', photo: null, notes: 'Marathon runner, vegan diet, prefers Nike running shoes' },
  { name: 'Quinn Roberts', date: '1992-07-11', category: 'family', photo: 'https://i.pravatar.cc/200?img=23', notes: 'Baker, loves desserts, watches cooking shows' },
  { name: 'Rachel Berg', date: '1990-09-04', category: 'friends', photo: 'https://i.pravatar.cc/200?img=24', notes: 'Travel blogger, has visited 40 countries, wants to go to Japan' },
  { name: 'Hanna Gau', date: '1988-04-29', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=25', notes: 'Art collector, into abstract painting, favourite artist: Kandinsky' },
  { name: 'Tiffany Chen', date: '1995-12-23', category: 'friends', photo: 'https://i.pravatar.cc/200?img=26', notes: 'K-pop fan, adores BTS, collects albums and merchandise' },
  { name: 'Ulrich Braun', date: '1987-01-17', category: 'other', photo: null, notes: 'History teacher, Civil War buff, reads biographies' },
  { name: 'Vanessa Lopez', date: '1994-05-09', category: 'family', photo: 'https://i.pravatar.cc/200?img=27', notes: 'Nurse, works night shifts, coffee lover, has 2 kids' },
  { name: 'Julia Davis', date: '1989-08-13', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=28', notes: 'Wine connoisseur, prefers red wine, visits vineyards' },
  { name: 'Anna Wilson', date: '1996-11-27', category: 'friends', photo: 'https://i.pravatar.cc/200?img=29', notes: 'Dog trainer, has 3 Golden Retrievers, loves the outdoors' },
  { name: 'Yasmin Ahmed', date: '1985-03-06', category: 'family', photo: 'https://i.pravatar.cc/200?img=30', notes: 'Architect, into modern design, favourite colour green' },
  { name: 'Sophia Moore', date: '1993-06-20', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=31', notes: 'Pianist, plays classical music, loves concerts' },
  { name: 'Amelia Clark', date: '1991-09-15', category: 'friends', photo: 'https://i.pravatar.cc/200?img=32', notes: 'Avid reader, loves mysteries, favourite author: Agatha Christie' },
  { name: 'Benjamin Harris', date: '1988-02-02', category: 'acquaintances', photo: null, notes: 'Car enthusiast, drives a BMW, follows F1' },
  { name: 'Chloe Walker', date: '1997-05-24', category: 'family', photo: 'https://i.pravatar.cc/200?img=34', notes: 'Professional makeup artist, loves beauty products, uses MAC cosmetics' },
  { name: 'Daniela Young', date: '1986-08-08', category: 'romantic', photo: 'https://i.pravatar.cc/200?img=35', notes: 'Chef, loves Asian cuisine, allergic to shellfish' },
  { name: 'Emily Turner', date: '1994-11-18', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=36', notes: 'Marketing manager, drinks matcha lattes, early riser' },
  { name: 'Chloe Rodriguez', date: '1992-03-12', category: 'friends', photo: 'https://i.pravatar.cc/200?img=37', notes: 'Surfer, lives near the beach, into sustainable fashion' },
  { name: 'Grace Mitchell', date: '1990-06-26', category: 'family', photo: 'https://i.pravatar.cc/200?img=38', notes: 'Interior designer, loves Scandinavian style, prefers neutral colours' },
  { name: 'Henry Phillips', date: '1987-10-01', category: 'other', photo: null, notes: 'Watch collector, into vintage Rolex, investment banker' },
  { name: 'Iris Campbell', date: '1995-02-14', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=48', notes: 'Ballet dancer, teaches classical ballet, vegan, shoe size 38' },
  { name: 'Jessica Baumann', date: '1989-07-30', category: 'friends', photo: 'https://i.pravatar.cc/200?img=40', notes: 'Journalist, writes for The Times, loves investigative reporting' },
  { name: 'Kylie Evans', date: '1996-04-05', category: 'family', photo: 'https://i.pravatar.cc/200?img=41', notes: 'Pharmacist, lactose intolerant, prefers herbal remedies' },
  { name: 'Lena Collins', date: '1984-09-22', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=42', notes: 'Cyclist, rides 100 km routes, needs cycling accessories' },
  { name: 'Mia Stewart', date: '1993-12-10', category: 'friends', photo: 'https://i.pravatar.cc/200?img=43', notes: 'Barista, coffee expert, wants an espresso machine' },
  { name: 'Noah Morris', date: '1991-01-28', category: 'acquaintances', photo: 'https://i.pravatar.cc/200?img=51', notes: 'Skater, into streetwear, wears Vans' },
  { name: 'Penelope Cox', date: '1988-05-16', category: 'family', photo: 'https://i.pravatar.cc/200?img=44', notes: 'Vet, has 4 cats, loves animals, also works weekends' },
  { name: 'Roberta Bailey', date: '1997-08-03', category: 'friends', photo: 'https://i.pravatar.cc/200?img=45', notes: 'Singer, into indie music, performs at local venues' },
  { name: 'Marcus "GhostByte" Johnson', date: '1995-06-14', category: 'gaming', photo: 'https://i.pravatar.cc/200?img=52', notes: 'Twitch streamer, plays Fortnite, uses Razer gear' },
  { name: 'Sarah "GamerGirl" Lee', date: '1998-09-22', category: 'gaming', photo: 'https://i.pravatar.cc/200?img=46', notes: 'League of Legends pro player, wants a gaming chair, drinks Red Bull' },
  { name: 'Alex "ProPlayer" Chen', date: '1992-12-08', category: 'gaming', photo: 'https://i.pravatar.cc/200?img=53', notes: 'Esports coach, CS:GO expert, prefers SteelSeries gear' },
  { name: 'Tyler "Speedrunner" Walsh', date: '1996-04-18', category: 'gaming', photo: 'https://i.pravatar.cc/200?img=54', notes: 'Speedruns Mario games, collects retro consoles, Nintendo fan' }
];

export function generateAvatarUrl(name: string): string {
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&size=200&background=random&color=fff&bold=true`;
}

export function generateMockBirthdays(idGenerator: () => string): Birthday[] {
  return MOCK_BIRTHDAY_RAW_DATA.map(({ name, date, category, photo, notes, email, phone, telegramUsername }) => ({
    id: idGenerator(),
    name,
    birthDate: date,
    zodiacSign: getZodiacSign(date).name,
    reminderDays: 7,
    category,
    notes,
    photo: photo || generateAvatarUrl(name),
    scheduledMessages: [],
    ...(email && { email }),
    ...(phone && { phone }),
    ...(telegramUsername && { telegramUsername })
  }));
}

export function createMockBirthday(overrides: Partial<Birthday> = {}): Birthday {
  const defaultDate = '1990-01-15';
  const birthDate = overrides.birthDate ?? defaultDate;
  const name = overrides.name ?? 'Test User';
  const base: Birthday = {
    id: 'mock-id-1',
    name,
    birthDate,
    zodiacSign: getZodiacSign(birthDate).name,
    reminderDays: 7,
    category: 'friends',
    notes: 'Test notes',
    photo: generateAvatarUrl(name),
    scheduledMessages: [],
  };
  return { ...base, ...overrides };
}
