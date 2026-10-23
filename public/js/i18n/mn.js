// Mongolian text. Same keys as en.js.
export default {
  // top bar and menu
  brandSub: "Хакатон ба Процесс", search: "Санаа, хүн, шошго хайх…", newIdea: "Шинэ санаа", shareIdea: "Санаа хуваалцах",
  navAll: "Бүх санаа", navHack: "Хакатон", navProc: "Процесс", navMine: "Миний санаа",

  // feed
  sortTop: "🔥 Шилдэг", sortNew: "🆕 Шинэ",
  catAll: "Бүгд", catHack: "Хакатон", catProc: "Процесс", catAI: "AI", catAutomation: "Автоматжуулалт",
  catCulture: "Соёл", catFinance: "Санхүү", catOffice: "Оффис",
  titleAll: "Бүх санаа", titleMine: "Миний санаа", titleCat: "{label} санаа",
  noMatch: "“{q}”-д тохирох санаа алга", tryOther: "Өөр үгээр хайгаад үзээрэй.",
  noMine: "Та одоогоор санаа хуваалцаагүй байна", noMineSub: "Бүтээж эсвэл сайжруулж болох зүйл байна уу?",
  noIdeas: "Одоогоор санаа алга", beFirstShare: "Эхний санааг та хуваалцаарай ✨",

  // right-hand panels
  annivTitle: "10 жил. 10× санаа.",
  annivText: "Ойн хакатоны санаа хүлээн авах хугацаа удахгүй дуусна — санаагаа нийтэлж, дэмжлэг цуглуулаарай.",
  days: "өдөр", hours: "цаг", mins: "мин",
  leaderboard: "🏆 Тэргүүлэгчид", seeAll: "Бүгдийг", noReactionsYet: "Одоогоор хариу үйлдэл алга — эхнийх нь болоорой!",
  statIdeas: "Санаа", statReacts: "Хариу үйлдэл", statPeople: "Оролцогч",

  // post card
  justNow: "дөнгөж сая", mAgo: "{n} мин өмнө", hAgo: "{n} цагийн өмнө", dAgo: "{n} өдрийн өмнө", edited: "засварласан",
  rank: "#{n} хамгийн их дэмжлэгтэй", taglineHack: "⚡ Хакатоны санаа", taglineProc: "⚙️ Процессын сайжруулалт",
  pillHack: "Хакатон", pillProc: "Процесс",
  editIdea: "Санаагаа засах", deleteIdea: "Санаагаа устгах",
  confirmDelete: "“{title}” санааг устгах уу? Хариу үйлдэл, сэтгэгдэл нь хамт устна.", deleted: "Санаа устгагдлаа",

  // reactions
  reactBulb: "Гайхалтай", reactFire: "Халуун", reactRocket: "Хэрэгжүүлье", reactClap: "Алга ташилт", reactHeart: "Таалагдлаа",
  react: "Хариу өгөх", nReactions: n => `${n} хариу үйлдэл`,

  // comments
  comment: "Сэтгэгдэл", nComments: n => `${n} сэтгэгдэл`,
  viewAll: "Бүх {n} сэтгэгдлийг харах", showLess: "Цөөн харуулах",
  addComment: "Сэтгэгдэл бичих…", send: "Илгээх", deleteComment: "Устгах", confirmDeleteComment: "Энэ сэтгэгдлийг устгах уу?",

  // new / edit idea form
  newTitle: "Шинэ санаа хуваалцах", editTitle: "Санаа засах", kind: "Ямар төрлийн санаа вэ?",
  hackIdea: "Хакатоны санаа", hackSub: "Бидний бүтээж болох зүйл",
  procIdea: "Процессын сайжруулалт", procSub: "Ажлын арга барилаа сайжруулах",
  fTitle: "Гарчиг", fTitlePh: "ж.нь: Баримтын зургийг зардлын тайлан болгодог Slack бот",
  fDesc: "Тайлбар", optional: "(заавал биш)", fDescPh: "Ямар асуудлыг шийдэх вэ? Хэнд ашигтай вэ? Хэрхэн ажиллах вэ?",
  fTags: "Шошго", tagsHint: "(заавал биш, таслалаар тусгаарлана)", fTagsPh: "AI, Автоматжуулалт, Санхүү",
  fImage: "Зураг", dropEmpty: "🖼️ &nbsp;<b>Зураг оруулах</b> эсвэл энд чирнэ үү",
  imgHint: "Зураг байхгүй юу? Асуудалгүй — гарчиг тань текст карт болно.",
  cancel: "Болих", postIdea: "Нийтлэх", posting: "Нийтэлж байна…", saveChanges: "Хадгалах", remove: "Хасах",
  toastLive: "🎉 Таны санаа нийтлэгдлээ — хамт олноо урьж дэмжлэг аваарай!", updated: "Санаа шинэчлэгдлээ",

  // profile
  back: "← Санаанууд руу буцах", editProfile: "Профайл засах", signOut: "Гарах", language: "Хэл",
  pIdeas: "Санаа", pReacts: "Авсан хариу үйлдэл", pComments: "Сэтгэгдэл",
  yourIdeas: "Таны санаанууд", theirIdeas: "{name} — санаанууд", noIdeasProfile: "Одоогоор санаа алга",
  addBio: "Хамт олондоо юун дээр ажилладгаа товч танилцуулаарай.",
  photo: "Зураг", changePhoto: "Зураг солих", displayName: "Харагдах нэр",
  displayNameHint: "Хоосон үлдээвэл нэвтрэх нэр тань харагдана: {name}",
  position: "Албан тушаал", positionPh: "ж.нь: Backend хөгжүүлэгч", bio: "Миний тухай", bioPh: "Юун дээр ажилладаг тухайгаа нэг өгүүлбэрээр",
  dept: "Хэлтэс", email: "Имэйл", fromAccount: "Хэлтэс, имэйл нь нэвтрэх бүртгэлээс ирдэг.",
  save: "Хадгалах", saving: "Хадгалж байна…", saved: "Профайл хадгалагдлаа",

  // sign-in screen
  welcome: "Idea Hub-д тавтай морил",
  signinIntro: "Хакатоны санаа, ажлаа сайжруулах санаагаа хуваалцаарай. Таалагдсан санаандаа хариу үйлдэл үзүүлээрэй — шилдэг нь дээр гарна.",
  workEmail: "Ажлын имэйл", password: "Нууц үг", pwHint: "Coremind компьютерийн (Windows) нууц үгээ ашиглана уу.",
  continue: "Нэвтрэх",

  // errors
  cantReach: "Idea Hub сервертэй холбогдож чадсангүй", badImage: "Энэ файлыг зураг болгон уншиж чадсангүй",
  genericError: "Алдаа гарлаа — дахин оролдоно уу",
};

// The server answers in English; these are its messages in Mongolian.
export const serverErrors = {
  "Please sign in": "Нэвтэрнэ үү",
  "Wrong email or password": "Имэйл эсвэл нууц үг буруу байна",
  "Enter your password": "Нууц үгээ оруулна уу",
  "Enter your work email": "Ажлын имэйлээ оруулна уу",
  "Too many failed attempts — wait 10 minutes and try again": "Хэт олон удаа буруу оруулсан — 10 минут хүлээгээд дахин оролдоно уу",
  "Can't reach the company directory — try again in a minute": "Компанийн бүртгэлтэй холбогдож чадсангүй — түр хүлээгээд дахин оролдоно уу",
  "Title is required": "Гарчиг оруулна уу",
  "Comment is required": "Сэтгэгдэл хоосон байна",
  "That idea no longer exists": "Энэ санаа устсан байна",
  "That comment no longer exists": "Энэ сэтгэгдэл устсан байна",
  "Image must be a JPEG, PNG or WebP": "Зураг JPEG, PNG эсвэл WebP байх ёстой",
  "Image must be smaller than 5 MB": "Зураг 5 MB-аас бага байх ёстой",
  "Server error — please try again": "Серверийн алдаа — дахин оролдоно уу",
};
