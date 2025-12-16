import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    create: { name: "admin" },
    update: {}
  });

  const editorRole = await prisma.role.upsert({
    where: { name: "editor" },
    create: { name: "editor" },
    update: {}
  });

  await prisma.role.upsert({
    where: { name: "user" },
    create: { name: "user" },
    update: {}
  });

  const passwordHash = await bcrypt.hash("admin12345", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    create: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash,
      roles: {
        create: [
          { roleId: adminRole.id },
          { roleId: editorRole.id }
        ]
      }
    },
    update: {}
  });

  const categories = ["Книги", "Услуги", "Аксессуары"].map((name) => ({
    name,
    slug: slugify(name)
  }));

  const createdCategories = await Promise.all(
    categories.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        create: c,
        update: { name: c.name }
      })
    )
  );

  const tags = ["Новинка", "Хит", "Скидка", "Подарок"].map((name) => ({
    name,
    slug: slugify(name)
  }));

  const createdTags = await Promise.all(
    tags.map((t) =>
      prisma.tag.upsert({
        where: { slug: t.slug },
        create: t,
        update: { name: t.name }
      })
    )
  );

  const products: Array<{
    title: string;
    description: string;
    price: Decimal;
    categorySlug: string;
    tagSlugs: string[];
  }> = [
    {
      title: "Книга: Основы Node.js",
      description: "Практическое введение в Node.js и серверную разработку.",
      price: new Decimal("499.00"),
      categorySlug: "книги",
      tagSlugs: ["новинка", "хит"]
    },
    {
      title: "Книга: Vue.js для начинающих",
      description: "Быстрый старт во Vue 3, компоненты и маршрутизация.",
      price: new Decimal("450.00"),
      categorySlug: "книги",
      tagSlugs: ["хит"]
    },
    {
      title: "Услуга: Настройка сайта-визитки",
      description: "Развёртывание и базовая настройка проекта под ключ.",
      price: new Decimal("2500.00"),
      categorySlug: "услуги",
      tagSlugs: ["скидка"]
    },
    {
      title: "Услуга: SEO аудит",
      description: "Базовый SEO аудит и рекомендации по улучшению.",
      price: new Decimal("1800.00"),
      categorySlug: "услуги",
      tagSlugs: ["подарок"]
    },
    {
      title: "Аксессуар: Обложка для книги",
      description: "Плотная обложка для защиты книги в дороге.",
      price: new Decimal("199.00"),
      categorySlug: "аксессуары",
      tagSlugs: ["новинка"]
    },
    {
      title: "Книга: PostgreSQL на практике",
      description: "Запросы, индексы, оптимизация и проектирование схем.",
      price: new Decimal("550.00"),
      categorySlug: "книги",
      tagSlugs: ["хит"]
    },
    {
      title: "Услуга: Подключение оплаты",
      description: "Интеграция платёжного модуля и тестовые платежи.",
      price: new Decimal("3200.00"),
      categorySlug: "услуги",
      tagSlugs: ["новинка"]
    },
    {
      title: "Аксессуар: Закладки набор 10шт",
      description: "Набор закладок для учебников и художественных книг.",
      price: new Decimal("149.00"),
      categorySlug: "аксессуары",
      tagSlugs: ["скидка"]
    },
    {
      title: "Книга: Архитектура Web приложений",
      description: "Паттерны, слои, безопасность, тестирование.",
      price: new Decimal("699.00"),
      categorySlug: "книги",
      tagSlugs: ["подарок"]
    },
    {
      title: "Услуга: Поддержка проекта (1 месяц)",
      description: "Мелкие доработки, обновления и контроль стабильности.",
      price: new Decimal("4000.00"),
      categorySlug: "услуги",
      tagSlugs: ["хит"]
    }
  ];

  for (const p of products) {
    const category = createdCategories.find((c) => c.slug === p.categorySlug);
    if (!category) continue;

    const slug = slugify(p.title);
    const product = await prisma.product.upsert({
      where: { slug },
      create: {
        title: p.title,
        slug,
        description: p.description,
        price: p.price,
        categoryId: category.id,
        images: {
          create: [
            { url: "https://placehold.co/600x400", alt: p.title, sortOrder: 0 }
          ]
        }
      },
      update: {
        title: p.title,
        description: p.description,
        price: p.price,
        categoryId: category.id
      }
    });

    const tagIds = createdTags
      .filter((t) => p.tagSlugs.includes(t.slug))
      .map((t) => t.id);

    await prisma.productTag.deleteMany({ where: { productId: product.id } });
    if (tagIds.length) {
      await prisma.productTag.createMany({
        data: tagIds.map((tagId) => ({ productId: product.id, tagId })),
        skipDuplicates: true
      });
    }
  }

  const newsItems = [
    {
      title: "Мы запустили каталог!",
      excerpt: "Теперь вы можете быстро найти товары и услуги.",
      content: "Добавили каталог с поиском и сортировкой. Скоро будут новые обновления.",
      isPublished: true
    },
    {
      title: "Скидки на услуги в декабре",
      excerpt: "Специальные цены до конца месяца.",
      content: "Проведём настройку и консультацию по проекту по сниженной цене.",
      isPublished: true
    }
  ];

  for (const n of newsItems) {
    const slug = slugify(n.title);
    await prisma.news.upsert({
      where: { slug },
      create: {
        title: n.title,
        slug,
        excerpt: n.excerpt,
        content: n.content,
        isPublished: n.isPublished,
        publishedAt: n.isPublished ? new Date() : null,
        authorId: admin.id,
        images: {
          create: [{ url: "https://placehold.co/800x400", alt: n.title, sortOrder: 0 }]
        }
      },
      update: {
        excerpt: n.excerpt,
        content: n.content,
        isPublished: n.isPublished,
        publishedAt: n.isPublished ? new Date() : null,
        authorId: admin.id
      }
    });
  }

  await prisma.contactRequest.createMany({
    data: [
      {
        name: "Иван",
        email: "ivan@example.com",
        phone: "+7 999 000-00-00",
        message: "Хочу консультацию по проекту."
      },
      {
        name: "Мария",
        email: "maria@example.com",
        phone: "+7 999 111-11-11",
        message: "Интересует услуга настройки сайта."
      }
    ],
    skipDuplicates: true
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


