/** All user-facing copy. Components never hardcode a string. */
export const copy = {
  appName: "Crisp",
  org: "Evercrisp",
  workspace: "Evercrisp",
  description: "Everything Evercrisp knows, in one place. Local until you publish it.",

  /** Shown on controls for features that are planned but not built. */
  notBuilt: "Not built yet",

  sidebar: {
    toggle: "Close sidebar",
    open: "Open sidebar",
    newPage: "New page",
    search: "Search",
    searchKey: "⌘K",
    home: "Home",
    recents: "Recent",
    private: "My drafts",
    addNew: "New page",
    teamspaces: "Shared",
    processes: "Processes",
    expand: "Expand",
    collapse: "Collapse",
    noPages: "No pages inside",
    theme: "Appearance",
    themes: { system: "Use system setting", light: "Light", dark: "Dark" },
  },

  nav: {
    drafts: "My drafts",
    clients: "Clients",
    processes: "Processes",
  },
  header: {
    search: "Search documents",
  },

  status: {
    local: "Draft",
    published: "Published",
    changed: "Unpublished changes",
    fromTeam: "From the team",
  },

  explore: {
    title: "Explore",
    browse: "Browse",
    query: "Query",
    everything: "Browsing every document. Pick a filter above or a place on the left; they stack here.",
    clear: "Clear all",
    remove: (label: string) => `Remove filter: ${label}`,
    filters: { type: "Type", client: "Client", process: "Process", state: "Status" },
    any: "Any",
    sort: { updated: "Last updated", title: "Title" },
    count: (n: number) => `${n} ${n === 1 ? "document" : "documents"}`,
    empty: "No documents match these filters.",
    internal: "Evercrisp",
    overview: "Overview",
    description: "Description",
    noBody: "No content yet.",
    open: "Open document",
    select: (title: string) => `Show details for ${title}`,
    details: "Details",
    published: "Published",
  },

  doc: {
    tabs: { content: "Content", comments: "Comments" },
  },

  topbar: {
    share: "Publish",
    shareNoBackend: "Publishing needs the team database, which is not connected yet.",
    shareUpToDate: "Already published to the team",
    shareHint: "Publish this page so the whole team can see it",
    shareConfirm: "Publish to team?",
    shareConfirmHint: "Click again to publish. Everyone on the team will be able to see this page.",
    sharing: "Publishing…",
    shareFailed: "Couldn't publish",
    readOnlyHost: "This deployment can't save. Run Crisp on your own machine to edit and publish (see the README).",
    shareOverwrite: "Overwrite team's version?",
    shareOverwriteHint: "A teammate published a newer version. Click again to replace it with yours.",
    shareConflict: "Newer version on team",
    copyLink: "Copy link",
    copied: "Link copied",
    more: "More actions",
  },

  database: {
    columns: {
      client: "Client",
      process: "Process",
      type: "Type",
      status: "Status",
      updated: "Updated",
    },
  },

  page: {
    untitled: "Untitled",
  },

  docTypes: {
    note: "Note",
    sop: "SOP",
    skill: "Skill",
    deliverable: "Deliverable",
    decision: "Decision",
  },

  blocks: {
    unsupported: (type: string) => `${type} blocks are not supported yet`,
  },

  editor: {
    placeholder: "Type '/' for commands",
    emptyHint: "Click to start writing",
    titlePlaceholder: "Untitled",
    drag: "Drag to move",
    add: "Add a block below",
    menuLabel: "Blocks",
    comingSoon: "Coming soon",
    noMatch: "No matching blocks",
    saving: "Saving…",
    saveFailed: "Couldn't save. Your changes are still here.",
    readOnly: "Read-only here. Run Crisp on your own machine to edit (see the README).",
    retry: "Try again",
    commands: {
      text: "Text",
      h1: "Heading 1",
      h2: "Heading 2",
      h3: "Heading 3",
      bullet: "Bulleted list",
      number: "Numbered list",
      todo: "To-do list",
      quote: "Quote",
      code: "Code",
      divider: "Divider",
      image: "Image",
      file: "File",
      table: "Table",
      video: "Video",
      embed: "Embed",
      chart: "Chart",
    },
  },

  search: {
    placeholder: "Search pages and content",
    label: "Search",
    recent: "Recent",
    results: "Results",
    empty: "No pages match",
    hint: "↑↓ to move · Enter to open · Esc to close",
  },

  teamNewer: {
    title: "A teammate published a newer version",
    body: (when: string, changed: boolean) =>
      `Published ${when}. ${changed ? "Your copy has edits that are not published." : "Your copy is older."} Publishing yours would replace theirs, so Publish asks first.`,
    take: "Use the team's version",
    takeConfirm: "Replace my copy? Click again",
    taking: "Replacing…",
    takeFailed: "Couldn't replace it",
  },

  auth: {
    title: "Sign in to Crisp",
    sub: "Evercrisp's internal workspace. Sign in with your Evercrisp Google account.",
    google: "Continue with Google",
    signingIn: "Redirecting to Google…",
    oauthError: "Something went wrong signing you in. Try again, or tell Dave if it keeps happening.",
    tryAgain: "Try again",
    noBackend: "Sign-in needs the team database, which is not connected yet.",
    notAuthorizedTitle: "Not on the team yet",
    notAuthorizedBody: (email: string) =>
      `${email} isn't on the Crisp team. Ask an admin to add you, then sign in again.`,
    backToSignIn: "Back to sign in",
    signOut: "Sign out",
  },

  error: {
    title: "Something went wrong",
    body: "This page could not load. Your documents are safe; nothing was changed.",
    retry: "Try again",
    home: "Back to Home",
  },

  theme: {
    toDark: "Switch to dark mode",
    toLight: "Switch to light mode",
  },

  notFound: {
    title: "Document not found",
    body: "It may have been moved or renamed in the workspace folder.",
    back: "Back to Home",
  },
} as const;
