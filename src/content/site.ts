import type { Locale } from "@/i18n/routing";

type LocalizedText = Record<Locale, string>;

export type PackageCategory = "individual" | "family" | "group";

export type UmrahPackage = {
  slug: string;
  category: PackageCategory;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  image: string;
  features: LocalizedText[];
  journeySteps: Array<{
    title: LocalizedText;
    copy: LocalizedText;
  }>;
};

export const packages: UmrahPackage[] = [
  {
    slug: "individual-umrah",
    category: "individual",
    title: { en: "Individual and Couple Umrah", ar: "عمرة الأفراد والأزواج" },
    summary: {
      en: "A journey coordinated around your dates, accommodation preferences, and transport needs.",
      ar: "رحلة تُنسق وفق تواريخكم وتفضيلات الإقامة واحتياجات التنقل.",
    },
    description: {
      en: "Falco coordinates the Saudi ground services requested by individuals and couples, with one clear point of contact from arrival through departure.",
      ar: "تنسق فالكو الخدمات الميدانية المطلوبة للأفراد والأزواج داخل السعودية، عبر جهة تواصل واضحة من الوصول حتى المغادرة.",
    },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCPGWZWtp2v4MTCYoQ2VVbaoWvbuX-6E_NF7QmIo1Vs2jKg5DNwL_3Kl2p3tMmT-DX-mhel0wL6TrUSdNc7uANDTGohtO7F4r9oyeUlQSSNvaIvcmw-nyh-oNoiKQgRA9NBsjO0f3e_DHQGoqlnfUs4CBxeoedlrqTl7L-3ZrR-EmP3aQyvva5ak4VHTOMl11xEwu8jm1Hl6GHRQpdQR8qP7Dr0dQwQHuhmmnTTdNhsv5fmeqH08w92",
    features: [
      { en: "Accommodation coordination", ar: "تنسيق الإقامة" },
      {
        en: "Airport and intercity transfers",
        ar: "النقل من المطار وبين المدن",
      },
      { en: "Ziyarat and guide requests", ar: "طلبات الزيارات والمرشدين" },
      { en: "On-ground trip support", ar: "دعم ميداني خلال الرحلة" },
    ],
    journeySteps: [
      {
        title: { en: "Share your journey", ar: "شارك تفاصيل رحلتك" },
        copy: {
          en: "Send your travel dates, arrival details, traveller count, and service preferences.",
          ar: "أرسل تواريخ السفر وتفاصيل الوصول وعدد المسافرين والخدمات المطلوبة.",
        },
      },
      {
        title: { en: "Review your proposal", ar: "راجع عرضك المخصص" },
        copy: {
          en: "Receive a tailored proposal based on availability and your confirmed requirements.",
          ar: "استلم عرضًا مخصصًا وفق التوفر والمتطلبات التي تم تأكيدها.",
        },
      },
      {
        title: { en: "Local coordination", ar: "التنسيق الميداني" },
        copy: {
          en: "Falco coordinates the agreed services in Saudi Arabia and supports itinerary changes.",
          ar: "تنسق فالكو الخدمات المتفق عليها داخل السعودية وتدعم تغييرات البرنامج.",
        },
      },
    ],
  },
  {
    slug: "family-umrah",
    category: "family",
    title: { en: "Family Umrah", ar: "عمرة العائلات" },
    summary: {
      en: "Family-focused coordination for rooms, luggage, transport, children, and mobility needs.",
      ar: "تنسيق يراعي الغرف والأمتعة والتنقلات والأطفال ومتطلبات سهولة الحركة.",
    },
    description: {
      en: "Falco builds the ground-service proposal around the family’s room configuration, arrival plan, transport preferences, and individual support needs.",
      ar: "تبني فالكو عرض الخدمات الميدانية وفق توزيع غرف العائلة وخطة الوصول وتفضيلات النقل واحتياجات الدعم الفردية.",
    },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD--fXAGUxRdQjiANN5S_nu7ZVfU5heSOsnDSgNj2KeQbIUfUoMS5ESikF4lcLURh_jznPX71isp8m8yaCXYr3T735L-cQOyZ8PkBg__YNVOv77NcgnGk0P_h66G2ChBoRmDg-HxjlKwh1rDoZZIhYLLjFRHd76lAtVSQB2BtuJcnIInIyJQTMiBUdmlQAtcNrx1I4HiKxb9dlzhblLGJEufn2Nm9yeMTC1htS6HHS8cdh9muMXQFZ5",
    features: [
      { en: "Family room configuration", ar: "تنسيق الغرف العائلية" },
      {
        en: "Private and group transport options",
        ar: "خيارات النقل الخاص والجماعي",
      },
      { en: "Luggage and arrival planning", ar: "تنسيق الأمتعة والوصول" },
      { en: "Mobility assistance requests", ar: "طلبات المساعدة الحركية" },
    ],
    journeySteps: [
      {
        title: { en: "Understand the family", ar: "فهم احتياجات العائلة" },
        copy: {
          en: "Confirm traveller ages, room setup, luggage, mobility needs, and flight details.",
          ar: "تأكيد أعمار المسافرين وتوزيع الغرف والأمتعة ومتطلبات الحركة والرحلات.",
        },
      },
      {
        title: { en: "Coordinate the services", ar: "تنسيق الخدمات" },
        copy: {
          en: "Match accommodation, transport, visits, and support to the family’s confirmed plan.",
          ar: "مواءمة الإقامة والنقل والزيارات والدعم مع خطة العائلة المؤكدة.",
        },
      },
      {
        title: { en: "Support the journey", ar: "دعم الرحلة" },
        copy: {
          en: "Maintain one contact path for agreed services and operational updates.",
          ar: "توفير مسار تواصل واحد للخدمات المتفق عليها والتحديثات التشغيلية.",
        },
      },
    ],
  },
  {
    slug: "group-agency-operations",
    category: "group",
    title: {
      en: "Groups and Agency Operations",
      ar: "عمليات المجموعات والوكالات",
    },
    summary: {
      en: "Saudi ground-service coordination for organized groups, agencies, and tour operators.",
      ar: "تنسيق الخدمات الميدانية داخل السعودية للمجموعات والوكالات ومنظمي الرحلات.",
    },
    description: {
      en: "A B2B coordination path for rooming lists, arrival waves, transport movements, group leaders, guides, meals, and pilgrim support.",
      ar: "مسار تنسيق للشركات يشمل قوائم الغرف ومواعيد الوصول وحركة المركبات وقادة المجموعات والمرشدين والوجبات ودعم المعتمرين.",
    },
    image:
      "https://lh3.googleusercontent.com/aida/AEtjO1UzeNA4wDm_h9ZzKXXS1GVyDwCPVOmAa_Ng-Mrync_DrhPNzdMMdxXUB7HUM0VqKdx3nkraTMOX41GZUPY1l08km3A2rNmVZZylqo82gcxR4qHQ0gjss9_aLX83KaVnLGm-iUfW-7YxIMzlsRLDJbSx73TH8Y7lZewFxE4scOiBUaaZhZOiohCjwlEG0HeZaS3ZZ73QB3iNhe1XC9WTsutazXna_lpsgb1xDJ3XRbVo5mcbp6ze1kf0xCA",
    features: [
      { en: "Rooming and arrival lists", ar: "قوائم الغرف والوصول" },
      { en: "Group transport movements", ar: "حركة نقل المجموعات" },
      { en: "Guide and meal coordination", ar: "تنسيق المرشدين والوجبات" },
      {
        en: "Agency-facing operations contact",
        ar: "جهة اتصال تشغيلية للوكالة",
      },
    ],
    journeySteps: [
      {
        title: { en: "Submit the group brief", ar: "إرسال موجز المجموعة" },
        copy: {
          en: "Share dates, manifests, rooming needs, flights, service scope, and operating language.",
          ar: "شارك التواريخ والقوائم واحتياجات الغرف والرحلات ونطاق الخدمة ولغة التشغيل.",
        },
      },
      {
        title: { en: "Approve the operating plan", ar: "اعتماد خطة التشغيل" },
        copy: {
          en: "Review the coordinated proposal, responsibilities, movements, and communication path.",
          ar: "راجع العرض المنسق والمسؤوليات وحركة المجموعة ومسار التواصل.",
        },
      },
      {
        title: { en: "Operate in Saudi Arabia", ar: "التنفيذ داخل السعودية" },
        copy: {
          en: "Falco coordinates the agreed local services with the agency or group leader.",
          ar: "تنسق فالكو الخدمات المحلية المتفق عليها مع الوكالة أو قائد المجموعة.",
        },
      },
    ],
  },
];

export const services = [
  {
    icon: "hotel",
    title: { en: "Accommodation", ar: "الإقامة" },
    copy: {
      en: "Economy through premium hotel requests with room type and distance stated clearly.",
      ar: "طلبات فنادق من الاقتصادية إلى الفاخرة مع توضيح نوع الغرفة والمسافة.",
    },
  },
  {
    icon: "bus",
    title: { en: "Transport", ar: "النقل" },
    copy: {
      en: "Airport, intercity, local, private, and group transport planned around the itinerary.",
      ar: "نقل من المطار وبين المدن وداخلها بسيارات خاصة أو حافلات وفق البرنامج.",
    },
  },
  {
    icon: "plane",
    title: { en: "Airport welcome", ar: "الاستقبال في المطار" },
    copy: {
      en: "Clear meeting points, flight monitoring, luggage considerations, and onward transfer.",
      ar: "نقاط لقاء واضحة ومتابعة للرحلة ومراعاة الأمتعة وتنسيق الانتقال.",
    },
  },
  {
    icon: "map",
    title: { en: "Ziyarat and guides", ar: "الزيارات والمرشدون" },
    copy: {
      en: "Makkah and Madinah visits with confirmed language, itinerary, and accessibility details.",
      ar: "زيارات في مكة والمدينة مع تأكيد اللغة والبرنامج وتفاصيل سهولة الوصول.",
    },
  },
  {
    icon: "utensils",
    title: { en: "Meals and catering", ar: "الوجبات والإعاشة" },
    copy: {
      en: "Meal coordination for families and groups around timing and dietary requirements.",
      ar: "تنسيق وجبات للعائلات والمجموعات وفق المواعيد والمتطلبات الغذائية.",
    },
  },
  {
    icon: "headphones",
    title: { en: "Local support", ar: "الدعم المحلي" },
    copy: {
      en: "A defined contact path for itinerary changes and on-ground assistance.",
      ar: "مسار تواصل واضح لتغييرات البرنامج والمساعدة داخل السعودية.",
    },
  },
];

export const agencyBenefits = [
  {
    title: { en: "White-label delivery", ar: "تنفيذ باسم وكالتكم" },
    copy: {
      en: "Optional agency branding on trip documents, welcome signs, and pilgrim kits.",
      ar: "إمكانية وضع هوية الوكالة على وثائق الرحلة ولوحات الاستقبال وحقائب المعتمرين.",
    },
  },
  {
    title: { en: "One operational request", ar: "طلب تشغيلي واحد" },
    copy: {
      en: "Combine rooms, transfers, meals, Ziyarat, and support in one proposal.",
      ar: "اجمع الغرف والتنقلات والوجبات والزيارات والدعم في عرض واحد.",
    },
  },
  {
    title: {
      en: "Protected client relationship",
      ar: "حماية علاقة الوكالة بعملائها",
    },
    copy: {
      en: "Falco operates behind the agency while the agency remains the primary client contact.",
      ar: "تعمل فالكو خلف الوكالة بينما تبقى الوكالة جهة التواصل الرئيسية مع العميل.",
    },
  },
  {
    title: { en: "Group-ready coordination", ar: "تنسيق جاهز للمجموعات" },
    copy: {
      en: "Rooming, flight manifests, arrival waves, vehicles, and group leaders handled together.",
      ar: "تنسيق الغرف وقوائم الرحلات ومواعيد الوصول والمركبات وقادة المجموعات معًا.",
    },
  },
];

export const faqs = [
  {
    question: {
      en: "Can packages be customized?",
      ar: "هل يمكن تخصيص الباقات؟",
    },
    answer: {
      en: "Yes. Falco prepares each proposal around travel dates, accommodation preferences, room setup, vehicles, visits, meals, mobility needs, and guide language.",
      ar: "نعم. تعد فالكو كل عرض وفق تواريخ السفر وتفضيلات الإقامة وتوزيع الغرف والمركبات والزيارات والوجبات ومتطلبات الحركة ولغة المرشد.",
    },
  },
  {
    question: {
      en: "Does Falco support travel agencies?",
      ar: "هل تتعامل فالكو مع وكالات السفر؟",
    },
    answer: {
      en: "Yes. Falco works with international travel agencies, tour operators, and group organizers that need local coordination in Saudi Arabia.",
      ar: "نعم. تتعامل فالكو مع وكالات السفر الدولية ومنظمي الرحلات والمجموعات التي تحتاج إلى تنسيق محلي داخل السعودية.",
    },
  },
  {
    question: {
      en: "How is pricing confirmed?",
      ar: "كيف يتم تأكيد الأسعار؟",
    },
    answer: {
      en: "Pricing is prepared after Falco reviews travel dates, group size, accommodation preferences, transport, and requested services.",
      ar: "يتم إعداد السعر بعد مراجعة فالكو لتواريخ السفر وحجم المجموعة وتفضيلات الإقامة والنقل والخدمات المطلوبة.",
    },
  },
];

export function localize(text: LocalizedText, locale: Locale) {
  return text[locale];
}

export function getPackage(slug: string) {
  return packages.find((item) => item.slug === slug);
}
