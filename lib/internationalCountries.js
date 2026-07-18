const IMG = (id, w = 640) =>
  `https://images.unsplash.com/${id}?w=${w}&h=320&fit=crop&q=80&auto=format`;

export const INTERNATIONAL_COUNTRIES = [
  {
    code: "IT",
    name: "Italy",
    region: "Southern Europe",
    image: IMG("photo-1764709981888-65e5389f4abc"),
    imageSrcSet: `${IMG("photo-1764709981888-65e5389f4abc", 640)} 640w, ${IMG("photo-1764709981888-65e5389f4abc", 960)} 960w`,
    imageAlt: "Rolling Tuscan hills and vineyards at golden hour",
    teaser:
      "Historic towns, regional lifestyles, complicated bureaucracy, and major differences in affordability from one province to the next.",
  },
  {
    code: "PT",
    name: "Portugal",
    region: "Southern Europe",
    image: IMG("photo-1754221717702-96c1e6c8f5b4"),
    imageSrcSet: `${IMG("photo-1754221717702-96c1e6c8f5b4", 640)} 640w, ${IMG("photo-1754221717702-96c1e6c8f5b4", 960)} 960w`,
    imageAlt: "Golden-hour cliffs and coastline along the Algarve",
    teaser:
      "Coastal living, growing international demand, shifting residency rules, and housing pressure in the best-known regions.",
  },
  {
    code: "ES",
    name: "Spain",
    region: "Southern Europe",
    image: IMG("photo-1743244705217-b95249e68d76"),
    imageSrcSet: `${IMG("photo-1743244705217-b95249e68d76", 640)} 640w, ${IMG("photo-1743244705217-b95249e68d76", 960)} 960w`,
    imageAlt: "Whitewashed Andalusian village stacked on a hillside",
    teaser:
      "Distinct regional cultures, strong infrastructure, varied climates, and a lifestyle that changes dramatically by province.",
  },
  {
    code: "FR",
    name: "France",
    region: "Western Europe",
    image: IMG("photo-1673511395117-104ed47789b5"),
    imageSrcSet: `${IMG("photo-1673511395117-104ed47789b5", 640)} 640w, ${IMG("photo-1673511395117-104ed47789b5", 960)} 960w`,
    imageAlt: "Lavender fields in Provence at sunset",
    teaser:
      "Excellent infrastructure and healthcare, but major differences in taxes, housing, language demands, and local bureaucracy.",
  },
  {
    code: "GR",
    name: "Greece",
    region: "Southern Europe",
    image: IMG("photo-1736618626004-c94407284b39"),
    imageSrcSet: `${IMG("photo-1736618626004-c94407284b39", 640)} 640w, ${IMG("photo-1736618626004-c94407284b39", 960)} 960w`,
    imageAlt: "Whitewashed hillside village overlooking the Aegean Sea",
    teaser:
      "Island and mainland lifestyles, seasonal economies, residency considerations, and infrastructure that varies sharply by location.",
  },
  {
    code: "CA",
    name: "Canada",
    region: "North America",
    image: IMG("photo-1464822759023-fed622ff2c3b"),
    imageSrcSet: `${IMG("photo-1464822759023-fed622ff2c3b", 640)} 640w, ${IMG("photo-1464822759023-fed622ff2c3b", 960)} 960w`,
    imageAlt: "Turquoise lake and pine forests in the Canadian Rockies",
    teaser:
      "Familiar culture and proximity to the U.S., but higher housing costs, provincial differences, and strict immigration pathways.",
  },
  {
    code: "MX",
    name: "Mexico",
    region: "North America",
    image: IMG("photo-1717654543196-4d6826ec4bb8"),
    imageSrcSet: `${IMG("photo-1717654543196-4d6826ec4bb8", 640)} 640w, ${IMG("photo-1717654543196-4d6826ec4bb8", 960)} 960w`,
    imageAlt: "Cobblestone street and colonial facades in San Miguel de Allende",
    teaser:
      "Affordable living in some regions, strong expat communities, and major location-by-location differences in safety and infrastructure.",
  },
  {
    code: "JP",
    name: "Japan",
    region: "East Asia",
    image: IMG("photo-1771030669105-170a9b3d70d7"),
    imageSrcSet: `${IMG("photo-1771030669105-170a9b3d70d7", 640)} 640w, ${IMG("photo-1771030669105-170a9b3d70d7", 960)} 960w`,
    imageAlt: "Traditional Kyoto street with tiled roofs and wooden houses",
    teaser:
      "Exceptional infrastructure and safety, paired with language barriers, cultural adjustment, and complicated long-term residency options.",
  },
  {
    code: "AU",
    name: "Australia",
    region: "Oceania",
    image: IMG("photo-1693295898594-995edb9a0773"),
    imageSrcSet: `${IMG("photo-1693295898594-995edb9a0773", 640)} 640w, ${IMG("photo-1693295898594-995edb9a0773", 960)} 960w`,
    imageAlt: "Dramatic coastal cliffs along the Great Ocean Road",
    teaser:
      "High quality of life, strong salaries, expensive housing, and immigration rules that can sharply limit who can realistically relocate.",
  },
  {
    code: "NZ",
    name: "New Zealand",
    region: "Oceania",
    image: IMG("photo-1506905925346-21bda4d32df4"),
    imageSrcSet: `${IMG("photo-1506905925346-21bda4d32df4", 640)} 640w, ${IMG("photo-1506905925346-21bda4d32df4", 960)} 960w`,
    imageAlt: "Snow-capped Southern Alps under a clear sky",
    teaser:
      "Natural beauty and a slower lifestyle, but geographic isolation, limited housing supply, and selective immigration pathways.",
  },
];

export const INTERNATIONAL_REPORT_TOPICS = [
  "Residency and visa pathways",
  "Housing and ownership restrictions",
  "Taxes and financial obligations",
  "Healthcare access",
  "Employment and remote-work rules",
  "Schools and education",
  "Cost of living",
  "Safety and political stability",
  "Climate and environmental risk",
  "Language and cultural adjustment",
  "Transportation and connectivity",
  "The catch",
  "Who the destination is genuinely right for",
  "Who should think twice",
];
