import React, { useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import SkillForkModal from "../../components/Skills/SkillForkModal";
import SkillManage from "../../components/Skills/SkillManage";
import SkillPermissions from "../../components/Skills/SkillPermissions";
import { ModalContext, ModalContextType, ModalData, ModalState, ModalType } from "./context";

/**
 * Provider for managing global modal state
 */
export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<ModalState | null>(null);

  const openModal = <T extends ModalType>(type: T, data: ModalData[T]) => {
    setModalState({ type, data });
  };

  const closeModal = () => {
    setModalState(null);
  };

  const isModalOpen = (type: ModalType) => {
    return modalState?.type === type;
  };

  const contextValue: ModalContextType = {
    openModal,
    closeModal,
    isModalOpen,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}

      {/* Skill Fork Modal */}
      <Dialog
        open={modalState?.type === ModalType.SKILL_FORK}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="w-[430px] p-0">
          {modalState?.type === ModalType.SKILL_FORK && (
            <SkillForkModal
              skillId={(modalState.data as ModalData[ModalType.SKILL_FORK]).skillId}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Skill Edit Modal */}
      <Dialog
        open={modalState?.type === ModalType.SKILL_EDIT}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="w-[430px] p-0">
          {modalState?.type === ModalType.SKILL_EDIT && (
            <SkillManage
              skill={(modalState.data as ModalData[ModalType.SKILL_EDIT]).skill}
              setOpen={() => closeModal()}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Skill Permissions Modal */}
      <Dialog
        open={modalState?.type === ModalType.SKILL_PERMISSIONS}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="w-[430px] p-0">
          {modalState?.type === ModalType.SKILL_PERMISSIONS && (
            <SkillPermissions
              id={(modalState.data as ModalData[ModalType.SKILL_PERMISSIONS]).skillId}
              key={(modalState.data as ModalData[ModalType.SKILL_PERMISSIONS]).skillId}
            />
          )}
        </DialogContent>
      </Dialog>
    </ModalContext.Provider>
  );
}
