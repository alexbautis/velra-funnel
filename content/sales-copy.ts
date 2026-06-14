// content/sales-copy.ts
// COPY FINAL Y AUDITADO de la Sales Page (brief 12 jun 2026).
// No reescribir ni una palabra.

export const SALES_COPY = {
  hero: {
    headline: "La única forma de saberlo es sentirlo en tu piel.",
    subheadline:
      "Pruébalo 90 días en tu casa. Si no sientes la diferencia, te devolvemos tu dinero.",
    badge: "40% OFF",
    cta: "Quiero probarlo con mi 40% OFF",
  },

  miniRecap: [
    "Ya lo viste.",
    "La celulitis se forma en la fascia, una capa profunda a la que ninguna crema puede llegar.",
    "Solo la presión mecánica constante trabaja esa capa. Es lo que hacen los tratamientos profesionales, sesión tras sesión, a precios que no terminan nunca.",
    "VELRA lleva ese mismo principio a tu casa.",
  ],

  howItWorks: {
    title: "Cómo funciona",
    steps: [
      {
        label: "Paso 1.",
        text: "Aplica una capa fina de aceite o crema. No como tratamiento, solo para que VELRA se deslice mejor. El trabajo real lo hace la presión rotatoria.",
      },
      {
        label: "Paso 2.",
        text: "Desliza VELRA unos minutos sobre las zonas que quieras trabajar. La presión mecánica constante estimula circulación, drenaje y movilidad del tejido.",
      },
      {
        label: "Paso 3.",
        text: "Repítelo a tu ritmo, en tu sofá, viendo la tele. Sin citas. Sin sesiones caras. Sin que la mano se canse.",
      },
    ],
    closing: "15 minutos al día. Eso es todo.",
  },

  offer: {
    title: "VELRA — 40% OFF",
    anchorPrice: "$179.95",
    todayLabel: "HOY:",
    price: "$129.95",
    savings: "AHORRAS $50",
    bullets: [
      "Transforma tu piel en 15 minutos al día",
      "Presión rotatoria constante, la que tu mano no puede mantener",
      "Garantía de 90 días para probarlo en tu piel",
      "+ Envío GRATIS",
    ],
    cta: "Quiero mi VELRA con 40% OFF",
  },

  guarantee: {
    title: "Tú decides. En tu piel, no en una promesa.",
    paragraphs: [
      "Úsalo 90 días completos en tu casa.",
      "Si no sientes la ligereza, el alivio y el cambio que te explicó la Dra. Reyes, escríbenos y te devolvemos tu dinero.",
      "Sin preguntas incómodas. Sin letra pequeña.",
      "Llevas años apostando a ciegas con cremas que no devolvían nada. Esta vez el riesgo lo tomamos nosotros.",
    ],
  },

  endorsement: {
    name: "Dra. Sofía Reyes",
    credentials:
      "Especialista en medicina estética y drenaje linfático. 12 años tratando celulitis.",
    quote:
      "VELRA aplica el mismo principio mecánico con el que trabajo en consulta. Por eso es lo que les recomiendo a mis pacientes para hacerlo desde casa.",
  },

  // Reseñas reales de clientas verificadas. Orden fijo: Patricia → Laura → Andrea.
  reviews: [
    {
      name: "Patricia M.",
      age: 48,
      city: "CDMX",
      stars: 5,
      time: "Hace 2 meses",
      initial: "P",
      avatar: "blush" as const,
      text: "Llevaba años gastando en cremas que no me hacían nada. La primera semana con VELRA noté las piernas más ligeras, como deshinchadas. Al mes ya se veía un cambio en la textura. Por fin algo que funciona de verdad.",
    },
    {
      name: "Laura R.",
      age: 56,
      city: "Guadalajara",
      stars: 5,
      time: "Hace 3 meses",
      initial: "L",
      avatar: "teal" as const,
      text: "Tengo 56 y pensaba que ya era tarde para mí. Empecé sin muchas expectativas y la diferencia la noté yo antes de notarla nadie más. Lo uso en el sofá mientras veo la novela. Quince minutos. Eso es todo.",
    },
    {
      name: "Andrea V.",
      age: 42,
      city: "Monterrey",
      stars: 5,
      time: "Hace 1 mes",
      initial: "A",
      avatar: "blush" as const,
      text: "Lo que más me convenció fue que no tengo que sacar tiempo para nada. Lo dejo al lado del sofá y lo uso mientras veo el teléfono. Llevo dos meses y mi pareja ya me dijo algo. Eso vale más que cualquier espejo.",
    },
  ] as {
    name: string;
    age: number;
    city: string;
    stars: number;
    time: string;
    initial: string;
    avatar: "blush" | "teal";
    text: string;
  }[],

  comparison: {
    title: "Hagamos cuentas.",
    intro: [
      "Una sesión de masaje reductivo o drenaje profesional en una clínica cuesta entre $40 y $80 USD.",
      "Y una sola sesión no hace nada. El protocolo mínimo son 8 a 12 sesiones.",
    ],
    clinic: {
      label: "Tratamiento en clínica:",
      math: "8–12 sesiones × $40–$80 =",
      total: "$320 a $960 USD",
      note: "Y cuando terminas, si quieres mantener resultados… vuelves a empezar. Y a pagar.",
    },
    velra: {
      label: "VELRA:",
      total: "$129.95 USD. Una vez.",
      note: "El mismo principio de presión mecánica. En tu casa. Todos los días que quieras. Para siempre.",
    },
    closing:
      "Menos de lo que cuestan 3 sesiones. Sin citas, sin traslados, sin volver a pagar cada mes.",
  },

  faq: [
    {
      question: "¿Cuánto tarda en llegar?",
      answer: "El tiempo de envío es de 7 a 10 días hábiles.",
    },
    {
      question: "¿Duele o lastima la piel?",
      answer:
        "No. La presión es firme pero la experiencia está diseñada para sentirse como un masaje profesional, no como un castigo. Tú controlas la intensidad de las pasadas.",
    },
    {
      question: "¿Cómo funciona la garantía?",
      answer:
        "Tienes 90 días desde que lo recibes. Si no estás satisfecha, nos escribes y te devolvemos tu dinero. Así de simple.",
    },
    {
      question: "¿Sirve para piernas, glúteos y abdomen?",
      answer:
        "Sí. Está diseñado para trabajar todas las zonas donde aparece la celulitis y la retención.",
    },
  ],

  finalCta: {
    paragraphs: [
      "Ya entendiste por qué nada de lo anterior funcionó.",
      "Ya viste dónde se forma el problema y qué es lo único que llega hasta ahí.",
      "Ya escuchaste a una especialista decirte que la edad nunca fue el problema.",
      "Solo queda una pregunta:",
    ],
    question: "¿Cuántos años más vas a seguir creyendo que ya es tarde?",
    closing:
      "Hoy puedes empezar desde tu casa. Con 90 días para comprobarlo en tu piel.",
    cta: "Quiero empezar hoy con mi 40% OFF",
    subCta: "Garantía de 90 días incluida. Envío GRATIS.",
  },
} as const;
