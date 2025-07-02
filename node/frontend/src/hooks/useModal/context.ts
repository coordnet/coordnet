import { Skill } from "@coordnet/core";
import { createContext } from "react";

// Define modal types
export enum ModalType {
  SKILL_FORK = "skill_fork",
  SKILL_EDIT = "skill_edit",
  SKILL_PERMISSIONS = "skill_permissions",
}

// Define modal data types
export interface ModalData {
  [ModalType.SKILL_FORK]: { skillId: string };
  [ModalType.SKILL_EDIT]: { skill: Skill };
  [ModalType.SKILL_PERMISSIONS]: { skillId: string };
}

// Modal state
export interface ModalState<T extends ModalType = ModalType> {
  type: T;
  data: ModalData[T];
}

// Context type
export interface ModalContextType {
  openModal: <T extends ModalType>(type: T, data: ModalData[T]) => void;
  closeModal: () => void;
  isModalOpen: (type: ModalType) => boolean;
}

/**
 * Context for managing global modal state
 */
export const ModalContext = createContext<ModalContextType | undefined>(undefined);
