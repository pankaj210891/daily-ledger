import { Dispatch, SetStateAction } from "react";
import { Entry } from "../../api";
import { Section } from "../../app/sectionConfig";

export type PageHeaderProps = {
  active: Section;
  user: string;
  userEmail: string;
  entries: Entry[];
  notifications: Entry[];
  search: string;
  setSearch: (value: string) => void;
  headerMenu: "notifications" | "profile" | null;
  setHeaderMenu: Dispatch<SetStateAction<"notifications" | "profile" | null>>;
  onSignOut: () => void;
  quickAddOpen: boolean;
  setQuickAddOpen: Dispatch<SetStateAction<boolean>>;
  onNavigate: (section: Section) => void;
  onStartAdd: (section?: Section, initialType?: string) => void;
  onRequestProductCreate: () => void;
  onOpenEntry: (entry: Entry) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  error: string;
  onRetry: () => void;
};
