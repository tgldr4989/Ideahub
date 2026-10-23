// English text. Keys missing from another language fall back to these.
export default {
  // top bar and menu
  brandSub: "Hackathon & Process", search: "Search ideas, people, tags…", newIdea: "New idea", shareIdea: "Share an idea",
  navAll: "All ideas", navHack: "Hackathon", navProc: "Process", navMine: "My ideas",

  // feed
  sortTop: "🔥 Top", sortNew: "🆕 Newest",
  titleAll: "All ideas", titleMine: "My ideas", titleHack: "Hackathon ideas", titleProc: "Process ideas",
  noMatch: "No ideas match “{q}”", tryOther: "Try a different search.",
  noMine: "You haven't shared an idea yet", noMineSub: "Got something we could build or do better?",
  noIdeas: "No ideas here yet", beFirstShare: "Be the first to share one ✨",

  // announcement above the feed — edit this text to change what everyone sees
  annBadge: "Announcement",
  annTitle: "Your ideas can shape Coremind's next 10 years",
  annText: "Anyone can post a hackathon idea or a way to improve how we work. Colleagues react, and the most-loved ideas rise to the top.",

  // right-hand panels
  annivTitle: "10 years. 10× ideas.",
  annivText: "Anniversary Hackathon submissions close soon — post your idea and rally reactions.",
  days: "days", hours: "hours", mins: "min",
  leaderboard: "🏆 Leaderboard", seeAll: "See all", noReactionsYet: "No reactions yet — be the first!",
  statIdeas: "Ideas", statReacts: "Reactions", statPeople: "Contributors",

  // post card
  justNow: "just now", mAgo: "{n}m ago", hAgo: "{n}h ago", dAgo: "{n}d ago", edited: "edited",
  rank: "#{n} most reacted", taglineHack: "⚡ Hackathon idea", taglineProc: "⚙️ Process improvement",
  pillHack: "Hackathon", pillProc: "Process",
  editIdea: "Edit your idea", deleteIdea: "Delete your idea",
  confirmDelete: "Delete “{title}”? Its reactions and comments will be removed too.", deleted: "Idea deleted",

  // reactions
  reactBulb: "Brilliant", reactFire: "Hot", reactRocket: "Ship it", reactClap: "Applause", reactHeart: "Love it",
  react: "React",

  // comments
  comment: "Comment", nComments: n => n === 1 ? "1 comment" : `${n} comments`,
  viewAll: "View all {n} comments", showLess: "Show fewer comments",
  addComment: "Add a comment…", send: "Post", deleteComment: "Delete", confirmDeleteComment: "Delete this comment?",

  // status
  statusAll: "All", statusNew: "New", statusConfirmed: "Confirmed", statusInProgress: "In progress", statusDone: "Done",
  changeStatus: "Move to:", statusChanged: "Status updated",

  // idea page
  commentsTitle: "Comments",
  details: "Details", addDetails: "Add details", editDetails: "Edit details", detailsSaved: "Details saved",
  addDetailsHint: "Add the problem, your solution and links to documents so colleagues can understand the idea and join.",
  noDetails: "The author hasn't added details yet.",
  dProblem: "Problem", dSolution: "Proposed solution", dImpact: "Expected impact", dResources: "What's needed",
  dProblemPh: "What problem or pain point does this solve? Who has it?",
  dSolutionPh: "How would it work? What would we build or change?",
  dImpactPh: "What gets better — time saved, money, happier customers or colleagues?",
  dResourcesPh: "People, skills, tools or budget needed",
  links: "Documents & links", addLink: "Add link", linkTitlePh: "Title, e.g. Spec document",
  team: "Team", author: "Author",
  joinTeam: "Request to join the team", joinMessagePh: "Why do you want to join? What can you bring? (optional)",
  joinSent: "Request sent", requestSent: "Request sent — waiting for {name} to answer",
  cancelRequest: "Cancel request", requestDeclined: "Your last request was declined. You can send a new one.",
  youAreMember: "You're on the team", leaveTeam: "Leave team", confirmLeave: "Leave this team?",
  joinOnlyConfirmed: "Join requests open once the idea is confirmed.",
  requests: "Join requests", noRequests: "No pending join requests", accept: "Accept", decline: "Decline",

  // new / edit idea form
  newTitle: "Share a new idea", editTitle: "Edit idea", kind: "What kind of idea?",
  hackIdea: "Hackathon idea", hackSub: "Something we could build",
  procIdea: "Process improvement", procSub: "Make how we work better",
  fTitle: "Title", fTitlePh: "e.g. Slack bot that turns receipts into expense reports",
  fDesc: "Describe it", optional: "(optional)", fDescPh: "What problem does it solve? Who benefits? How might it work?",
  fTags: "Tags", tagsHint: "(optional, comma separated)", fTagsPh: "AI, Automation, Finance",
  fImage: "Image", dropEmpty: "🖼️ &nbsp;<b>Upload an image</b> or drag it here",
  imgHint: "No image? No problem — your title becomes a text card.",
  cancel: "Cancel", postIdea: "Post idea", posting: "Posting…", saveChanges: "Save changes", remove: "Remove",
  toastLive: "🎉 Your idea is live — invite colleagues to react!", updated: "Idea updated",

  // profile
  back: "← Back to ideas", editProfile: "Edit profile", signOut: "Sign out", language: "Language",
  pIdeas: "Ideas", pReacts: "Reactions received", pComments: "Comments",
  yourIdeas: "Your ideas", theirIdeas: "Ideas by {name}", noIdeasProfile: "No ideas yet",
  addBio: "Add a short bio so colleagues know what you work on.",
  photo: "Photo", changePhoto: "Change photo", displayName: "Display name",
  displayNameHint: "Leave empty to use your sign-in name: {name}",
  position: "Position", positionPh: "e.g. Backend developer", bio: "About you", bioPh: "A sentence about what you work on",
  dept: "Department", email: "Email", fromAccount: "Department and email come from your sign-in account.",
  save: "Save", saving: "Saving…", saved: "Profile saved",

  // sign-in screen
  welcome: "Welcome to Idea Hub",
  signinIntro: "Share hackathon ideas and ways to improve how we work. React to the ones you love — the best rise to the top.",
  workEmail: "Work email", password: "Password", pwHint: "Use your Coremind computer (Windows) password.",
  continue: "Continue",

  // errors
  cantReach: "Can't reach the Idea Hub server", badImage: "That file isn't an image we can read",
  genericError: "Something went wrong — please try again",
};
