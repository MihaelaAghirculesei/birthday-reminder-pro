import { Birthday } from '../../shared/models/birthday.model';
import { getZodiacSign } from '../../shared';

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
  { name: 'Uwe Müller', date: '1990-03-15', category: 'family', photo: 'https://i.pravatar.cc/200?img=1', notes: 'Ama i romanzi fantasy, appassionato di caffè, colleziona dischi in vinile', email: 'uwe.mueller@email.com', phone: '+49 170 1234567' },
  { name: 'Bob Smith', date: '1985-06-22', category: 'friends', photo: 'https://i.pravatar.cc/200?img=12', notes: 'Appassionato di fotografia, usa attrezzatura Canon, colore preferito il blu', email: 'bob.smith@gmail.com' },
  { name: 'Charlie Brown', date: '1992-09-10', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=13', notes: 'Fanatico della palestra, ama gli integratori proteici, fan dei film Marvel' },
  { name: 'Diana Prince', date: '1988-12-05', category: 'friends', photo: 'https://i.pravatar.cc/200?img=5', notes: 'Suona la chitarra, appassionata di rock, segue la Formula 1', telegramUsername: 'diana_prince' },
  { name: 'Edward Norton', date: '1995-02-28', category: 'family', photo: 'https://i.pravatar.cc/200?img=14', notes: 'Amante del giardinaggio, preferisce le piante grasse, allergico ai gatti' },
  { name: 'Fiona Apple', date: '1987-07-18', category: 'romantic', photo: 'https://i.pravatar.cc/200?img=9', notes: 'Istruttrice di yoga, ama il tè biologico, usa app di meditazione, dieta senza glutine', email: 'fiona.apple@yoga.com', phone: '+44 7911 123456', telegramUsername: 'fiona_yoga' },
  { name: 'George Martin', date: '1993-10-03', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=15', notes: 'Costruisce PC da gaming, gioca a FPS, preferito: Call of Duty' },
  { name: 'Hannah Montana', date: '1991-04-12', category: 'friends', photo: 'https://i.pravatar.cc/200?img=10', notes: 'Vegetariana, ama la cucina italiana, apprezza il vino bianco', phone: '+1 555 0199' },
  { name: 'Isabella Garcia', date: '1994-01-08', category: 'family', photo: 'https://i.pravatar.cc/200?img=16', notes: 'Appassionata di moda, taglia S, preferisce lo stile minimalista', email: 'isabella.garcia@outlook.com' },
  { name: 'Jack Thompson', date: '1989-05-19', category: 'acquaintances', photo: 'https://i.pravatar.cc/200?img=17', notes: 'Appassionato di tecnologia, usa iPhone 15, vuole gli AirPods Pro', email: 'jack.t@techmail.com', telegramUsername: 'jacktech' },
  { name: 'Katherine Lee', date: '1996-08-25', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=20', notes: 'Lavora in finanza, vive a Londra, ha 1 cane' },
  { name: 'Liam O\'Connor', date: '1986-11-14', category: 'friends', photo: 'https://i.pravatar.cc/200?img=33', notes: 'Studia legge, dipendente dalle energy drink, nottambulo' },
  { name: 'Maya Patel', date: '1993-02-28', category: 'family', photo: 'https://i.pravatar.cc/200?img=21', notes: 'Si è trasferita a New York, studia spagnolo, ama il trekking', email: 'maya.patel@nyc.com' },
  { name: 'Olivia Martinez', date: '1997-10-21', category: 'friends', photo: 'https://i.pravatar.cc/200?img=47', notes: 'Sviluppatrice software, fan delle tastiere meccaniche, gioca a scacchi online', telegramUsername: 'olivia_dev' },
  { name: 'Patrick Anderson', date: '1984-02-16', category: 'acquaintances', photo: null, notes: 'Maratoneta, dieta vegana, preferisce le scarpe da corsa Nike' },
  { name: 'Quinn Roberts', date: '1992-07-11', category: 'family', photo: 'https://i.pravatar.cc/200?img=23', notes: 'Panettiere, ama i dolci, guarda programmi di cucina' },
  { name: 'Rachel Green', date: '1990-09-04', category: 'friends', photo: 'https://i.pravatar.cc/200?img=24', notes: 'Travel blogger, ha visitato 40 paesi, vuole andare in Giappone' },
  { name: 'Hanna Gau', date: '1988-04-29', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=25', notes: 'Collezionista d\'arte, appassionata di pittura astratta, artista preferito: Kandinsky' },
  { name: 'Tiffany Chen', date: '1995-12-23', category: 'friends', photo: 'https://i.pravatar.cc/200?img=26', notes: 'Fan del K-pop, adora i BTS, colleziona album e merchandise' },
  { name: 'Ulysses Grant', date: '1987-01-17', category: 'other', photo: null, notes: 'Insegnante di storia, appassionato della Guerra Civile, legge biografie' },
  { name: 'Vanessa Lopez', date: '1994-05-09', category: 'family', photo: 'https://i.pravatar.cc/200?img=27', notes: 'Infermiera, fa turni notturni, amante del caffè, ha 2 figli' },
  { name: 'Julia Davis', date: '1989-08-13', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=28', notes: 'Intenditrice di vini, preferisce il vino rosso, visita vigneti' },
  { name: 'Anna Wilson', date: '1996-11-27', category: 'friends', photo: 'https://i.pravatar.cc/200?img=29', notes: 'Addestratrice di cani, ha 3 Golden Retriever, ama le attività all\'aria aperta' },
  { name: 'Yasmin Ahmed', date: '1985-03-06', category: 'family', photo: 'https://i.pravatar.cc/200?img=30', notes: 'Architetta, appassionata di design moderno, colore preferito il verde' },
  { name: 'Sophia Moore', date: '1993-06-20', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=31', notes: 'Pianista, suona musica classica, ama i concerti' },
  { name: 'Amelia Clark', date: '1991-09-15', category: 'friends', photo: 'https://i.pravatar.cc/200?img=32', notes: 'Lettrice accanita, ama i gialli, autrice preferita: Agatha Christie' },
  { name: 'Benjamin Harris', date: '1988-02-02', category: 'acquaintances', photo: null, notes: 'Appassionato di auto, guida una BMW, segue la F1' },
  { name: 'Chloe Walker', date: '1997-05-24', category: 'family', photo: 'https://i.pravatar.cc/200?img=34', notes: 'Truccatrice professionista, ama i prodotti di bellezza, usa cosmetici MAC' },
  { name: 'Daniela Young', date: '1986-08-08', category: 'romantic', photo: 'https://i.pravatar.cc/200?img=35', notes: 'Chef, ama la cucina asiatica, allergica ai crostacei' },
  { name: 'Emily Turner', date: '1994-11-18', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=36', notes: 'Responsabile marketing, beve latte al matcha, mattiniera' },
  { name: 'Chloe Rodriguez', date: '1992-03-12', category: 'friends', photo: 'https://i.pravatar.cc/200?img=37', notes: 'Surfista, vive vicino alla spiaggia, appassionata di moda sostenibile' },
  { name: 'Grace Mitchell', date: '1990-06-26', category: 'family', photo: 'https://i.pravatar.cc/200?img=38', notes: 'Interior designer, ama lo stile scandinavo, preferisce i colori neutri' },
  { name: 'Henry Phillips', date: '1987-10-01', category: 'other', photo: null, notes: 'Collezionista di orologi, appassionato di Rolex vintage, banchiere d\'investimento' },
  { name: 'Iris Campbell', date: '1995-02-14', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=48', notes: 'Ballerina, insegna balletto classico, vegana, numero di scarpe 38' },
  { name: 'Jessica Parker', date: '1989-07-30', category: 'friends', photo: 'https://i.pravatar.cc/200?img=40', notes: 'Giornalista, scrive per The Times, ama i reportage investigativi' },
  { name: 'Kylie Evans', date: '1996-04-05', category: 'family', photo: 'https://i.pravatar.cc/200?img=41', notes: 'Farmacista, intollerante al lattosio, preferisce i rimedi erboristici' },
  { name: 'Lena Collins', date: '1984-09-22', category: 'colleagues', photo: 'https://i.pravatar.cc/200?img=42', notes: 'Ciclista, fa percorsi da 100km, ha bisogno di accessori per ciclismo' },
  { name: 'Mia Stewart', date: '1993-12-10', category: 'friends', photo: 'https://i.pravatar.cc/200?img=43', notes: 'Barista, esperta di caffè, vuole una macchina per espresso' },
  { name: 'Noah Morris', date: '1991-01-28', category: 'acquaintances', photo: 'https://i.pravatar.cc/200?img=51', notes: 'Skater, appassionato di streetwear, indossa scarpe Vans' },
  { name: 'Penelope Cox', date: '1988-05-16', category: 'family', photo: 'https://i.pravatar.cc/200?img=44', notes: 'Veterinaria, ha 4 gatti, ama gli animali, lavora anche il weekend' },
  { name: 'Roberta Bailey', date: '1997-08-03', category: 'friends', photo: 'https://i.pravatar.cc/200?img=45', notes: 'Cantante, appassionata di musica indie, si esibisce nei locali della zona' },
  { name: 'Marcus "Ninja" Johnson', date: '1995-06-14', category: 'gaming', photo: 'https://i.pravatar.cc/200?img=52', notes: 'Streamer su Twitch, gioca a Fortnite, usa periferiche Razer' },
  { name: 'Sarah "GamerGirl" Lee', date: '1998-09-22', category: 'gaming', photo: 'https://i.pravatar.cc/200?img=46', notes: 'Pro player di League of Legends, vuole una sedia da gaming, beve Red Bull' },
  { name: 'Alex "ProPlayer" Chen', date: '1992-12-08', category: 'gaming', photo: 'https://i.pravatar.cc/200?img=53', notes: 'Coach di esport, esperto di CS:GO, preferisce le periferiche SteelSeries' },
  { name: 'Tyler "Speedrunner" Walsh', date: '1996-04-18', category: 'gaming', photo: 'https://i.pravatar.cc/200?img=54', notes: 'Fa speedrun dei giochi Mario, colleziona console retro, fan di Nintendo' }
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

export function createMockBirthday(
  idGenerator: () => string,
  overrides: Partial<Birthday> = {}
): Birthday {
  const defaultDate = '1990-01-15';
  return {
    id: idGenerator(),
    name: 'Test User',
    birthDate: defaultDate,
    zodiacSign: getZodiacSign(defaultDate).name,
    reminderDays: 7,
    category: 'friends',
    notes: 'Test notes',
    photo: generateAvatarUrl('Test User'),
    scheduledMessages: [],
    ...overrides
  };
}
