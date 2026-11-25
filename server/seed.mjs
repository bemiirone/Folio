import { randomUUID } from 'node:crypto';

const iso = (hoursAgo) => new Date(Date.now() - hoursAgo * 3600_000).toISOString();
const fid = () => randomUUID().slice(0, 8);

const field = (key, label, type, extra = {}) => ({ id: fid(), key, label, type, required: false, ...extra });

export function seed() {
  const notesId = randomUUID();
  const readsId = randomUUID();
  const kitchenId = randomUUID();

  const collections = [
    {
      id: notesId, name: 'Field Notes', icon: 'map', color: '#23C48E',
      description: 'Observations from the ridge, the millpond and the long way home.',
      createdAt: iso(24 * 40), updatedAt: iso(3),
      schema: [
        field('location', 'Location', 'text', { required: true, placeholder: 'Where were you?' }),
        field('observed_on', 'Observed on', 'date'),
        field('conditions', 'Conditions', 'select', { options: ['Clear', 'Overcast', 'Rain', 'Fog', 'Snow'] }),
        field('elevation_m', 'Elevation (m)', 'number', { min: 0, max: 9000 }),
        field('notes', 'Notes', 'textarea', { placeholder: 'What did you see, hear, smell?' }),
      ],
    },
    {
      id: readsId, name: 'Reading Queue', icon: 'book-open', color: '#5B8CFF',
      description: 'Books queued, underway and finished — with honest little reviews.',
      createdAt: iso(24 * 60), updatedAt: iso(7),
      schema: [
        field('author', 'Author', 'text', { required: true }),
        field('pages', 'Pages', 'number', { min: 1, max: 20000 }),
        field('status', 'Status', 'select', { required: true, options: ['Queued', 'Reading', 'Finished', 'Abandoned'] }),
        field('rating', 'Rating (1–5)', 'number', { min: 1, max: 5 }),
        field('review', 'Review', 'textarea'),
      ],
    },
    {
      id: kitchenId, name: 'Kitchen Ledger', icon: 'wrench', color: '#FFB224',
      description: 'Recipes that earned a permanent card in the box.',
      createdAt: iso(24 * 90), updatedAt: iso(26),
      schema: [
        field('servings', 'Servings', 'number', { min: 1, max: 40 }),
        field('prep_min', 'Prep (minutes)', 'number', { min: 0, max: 2880 }),
        field('difficulty', 'Difficulty', 'select', { options: ['Easy', 'Medium', 'Project'] }),
        field('ingredients', 'Ingredients', 'tags'),
        field('method', 'Method', 'textarea'),
      ],
    },
  ];

  const doc = (collectionId, title, values, tags, starred, hoursAgo) => ({
    id: randomUUID(), collectionId, title, values, tags, starred,
    createdAt: iso(hoursAgo + 2), updatedAt: iso(hoursAgo),
  });

  const documents = [
    doc(notesId, 'Heron at the millpond', {
      location: 'Millpond, lower gate', observed_on: '2026-11-14', conditions: 'Fog', elevation_m: 84,
      notes: 'Grey heron stood motionless for eleven minutes, then struck twice — missed both. Fog lifted at 08:40 and it left upstream without a sound.',
    }, ['birds', 'water', 'dawn'], true, 3),
    doc(notesId, 'First frost on the ridge', {
      location: 'Cairn ridge path', observed_on: '2026-11-09', conditions: 'Clear', elevation_m: 412,
      notes: 'Every spiderweb between the gorse had become a white rope. Ground hard underfoot; the beck still running below the ice shelf.',
    }, ['frost', 'ridge'], false, 120),
    doc(notesId, 'Fox tracks by the weir', {
      location: 'Weir pool, east bank', observed_on: '2026-11-02', conditions: 'Overcast', elevation_m: 71,
      notes: 'A neat line of prints in the silt, purposeful, heading for the bridge. Otter spraint on the far rock — worth a return visit.',
    }, ['mammals', 'water'], false, 290),
    doc(notesId, 'Kingfisher, brief', {
      location: 'Alder bend', observed_on: '2026-10-27', conditions: 'Clear', elevation_m: 66,
      notes: 'A blue spark along the water for maybe four seconds. Perched once, dropped, gone. The whole walk was worth it.',
    }, ['birds', 'water'], true, 430),
    doc(notesId, 'Storm light over the fell', {
      location: 'South fell shoulder', observed_on: '2026-10-19', conditions: 'Rain', elevation_m: 505,
      notes: 'Squall line crossed the valley in curtains. For a minute the whole moor went brass-coloured under a black sky. Sheltered by the wall and just watched.',
    }, ['weather', 'ridge'], false, 620),

    doc(readsId, 'The Left Hand of Darkness', {
      author: 'Ursula K. Le Guin', pages: 304, status: 'Finished', rating: 5,
      review: 'The ice crossing is the best thing I have read all year. A book about trust disguised as a book about snow.',
    }, ['scifi', 'classic'], false, 48),
    doc(readsId, 'Piranesi', {
      author: 'Susanna Clarke', pages: 272, status: 'Finished', rating: 5,
      review: 'The Beauty of the House is immeasurable; its Kindness infinite. Read it in two sittings and immediately wanted to start again.',
    }, ['fantasy'], true, 7),
    doc(readsId, 'The Master and Margarita', {
      author: 'Mikhail Bulgakov', pages: 432, status: 'Reading', rating: null,
      review: 'Halfway. The cat has just done the thing with the primus stove. No further comment.',
    }, ['classic', 'russian'], false, 26),
    doc(readsId, 'A Field Guide to Getting Lost', {
      author: 'Rebecca Solnit', pages: 224, status: 'Queued', rating: null, review: '',
    }, ['essays', 'walking'], false, 200),
    doc(readsId, 'The Peregrine', {
      author: 'J. A. Baker', pages: 239, status: 'Reading', rating: 4,
      review: 'Ten winters compressed into one. Prose like weather. Pairs suspiciously well with the field notes collection.',
    }, ['nature', 'classic'], false, 96),

    doc(kitchenId, 'Weeknight ragù', {
      servings: 4, prep_min: 45, difficulty: 'Medium',
      ingredients: ['beef mince', 'soffritto', 'tomato paste', 'red wine', 'milk', 'tagliatelle'],
      method: 'Brown the mince hard in batches. Soften soffritto, add paste, deglaze with wine. Return meat, add milk, then barely simmer 40 minutes. Season late.',
    }, ['pasta', 'batch-cook'], true, 26),
    doc(kitchenId, 'Miso butter mushrooms', {
      servings: 2, prep_min: 15, difficulty: 'Easy',
      ingredients: ['chestnut mushrooms', 'white miso', 'butter', 'thyme', 'sourdough'],
      method: 'Dry-fry mushrooms until squeaky, then add butter and miso off the heat. Thyme at the end. Pile onto toast. Eat standing up.',
    }, ['quick', 'vegetarian'], false, 74),
    doc(kitchenId, 'Lemon posset', {
      servings: 6, prep_min: 10, difficulty: 'Easy',
      ingredients: ['double cream', 'caster sugar', 'lemons'],
      method: 'Boil cream and sugar exactly 3 minutes. Off heat, whisk in lemon juice. Pour, chill overnight. It sets like a small miracle.',
    }, ['dessert', 'make-ahead'], false, 160),
    doc(kitchenId, 'Saturday soda bread', {
      servings: 8, prep_min: 50, difficulty: 'Easy',
      ingredients: ['flour', 'buttermilk', 'bicarb', 'salt', 'oats'],
      method: 'Mix fast, handle barely, cross the top deeply. 40 minutes at 200°C. Wrap in a tea towel while it cools so the crust stays kind.',
    }, ['bread', 'weekend'], false, 300),
  ];

  return { collections, documents };
}