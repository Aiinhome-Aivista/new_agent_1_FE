import React from "react";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "../Button/Button";
import { cn } from "../../../utils/cn";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "primary" | "warning" | "orange";
  showIcon?: boolean;
  isLoading?: boolean;
  confirmClassName?: string;
  cancelClassName?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "orange",
  showIcon = false,
  isLoading = false,
  confirmClassName,
  cancelClassName,
}) => {
  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <Trash2 size={22} className="text-destructive" />;
      case "warning":
        return <AlertTriangle size={22} className="text-amber-500" />;
      default:
        return <Info size={22} className="text-primary" />;
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case "destructive":
        return "bg-destructive/10";
      case "warning":
        return "bg-amber-500/10";
      default:
        return "bg-primary/10";
    }
  };

  const getConfirmButtonClasses = () => {
    if (confirmClassName) return confirmClassName;

    switch (variant) {
      case "destructive":
        return "bg-destructive text-white hover:bg-destructive/90 shadow-sm";
      case "warning":
        return "bg-amber-500 text-white hover:bg-amber-600 shadow-sm";
      case "primary":
        return "bg-primary-orange text-white hover:bg-hover-orange shadow-sm";
      case "orange":
      default:
        return "bg-button-orange text-white hover:bg-hover-orange shadow-sm active:scale-[0.98]";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className="max-w-md"
      closeOnOverlayClick={!isLoading}
    >
      <div className="flex flex-col gap-4 py-2">
        {showIcon ? (
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-full ${getIconBg()} flex-shrink-0 mt-0.5`}>
              {getIcon()}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {message}
              </p>
              <p className="text-xs text-muted-foreground">
                Please confirm if you want to proceed.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {message}
            </p>
            <p className="text-xs text-muted-foreground">
              Please confirm if you want to proceed.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              "text-xs h-9 px-4 font-medium border-border hover:bg-muted text-foreground rounded-lg transition-colors",
              cancelClassName
            )}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className={cn(
              "text-xs h-9 px-4 font-semibold rounded-lg transition-all cursor-pointer border-0",
              getConfirmButtonClasses()
            )}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
