import "./Editor/styles.css";

import clsx from "clsx";
import { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

interface NodeProps extends React.SelectHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  text?: string;
  className?: string;
  iconClassName?: string;
  strokeWidth?: number;
}

const Button = forwardRef<HTMLButtonElement, NodeProps>(
  ({ icon, text, className, iconClassName, strokeWidth = 2, ...props }, ref) => {
    const IconComponent = icon;
    return (
      <button
        className={clsx(
          "bg-white border border-gray-6 text-gray-2 flex items-center justify-center rounded shadow-md",
          className,
        )}
        ref={ref}
        {...props}
      >
        {IconComponent ? (
          <IconComponent
            className={clsx("size-4 focus:outline-none", text && "mr-1", iconClassName)}
            tabIndex={-1}
            strokeWidth={strokeWidth}
          />
        ) : (
          <></>
        )}
        {text ? " " + text : ""}
      </button>
    );
  },
);

export default Button;
