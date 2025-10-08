
// Demo catalogs & seed data
const Catalog = {
  locations: ['거실','주방','침실','욕실','발코니','현관','복도'],
  trades: ['바닥재','도장','도배','타일','창호','설비','전기','가구']
};

let AppState = {
  session: null,
  cases: [
    {
      id: 'CASE-24001',
      type: '하자접수',
      created_at: '2025-10-01 10:30',
      defects: [{
        id: 'DEF-1',
        location: '거실', trade: '바닥재', content: '마루판 들뜸',
        photos: { near: null, far: null }, memo: ''
      }]
    }
  ]
};
