export type Comment = {
  id: string;
  documentId: string;
  authorId: string | null;
  authorEmail: string | null;
  quote: string;
  prefix: string;
  suffix: string;
  body: string;
  createdAt: string;
};
