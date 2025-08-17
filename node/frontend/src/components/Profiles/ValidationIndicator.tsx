import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { socialMediaValidators } from "@/utils/socialMediaValidation";

interface ValidationIndicatorProps {
  value: string;
  platform: keyof typeof socialMediaValidators;
  className?: string;
}

export function ValidationIndicator({ value, platform, className = "" }: ValidationIndicatorProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!value || value === "") {
      setIsValid(null);
      return;
    }

    const validator = socialMediaValidators[platform];
    if (!validator) {
      setIsValid(null);
      return;
    }

    setIsChecking(true);
    
    const basicValid = validator.pattern.test(value);
    setIsValid(basicValid);
    setIsChecking(false);

  }, [value, platform]);

  if (!value || isValid === null) return null;

  return (
    <div className={`flex items-center ${className}`}>
      {isChecking ? (
        <div className="size-4 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      ) : isValid ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <X className="size-4 text-red-500" />
      )}
    </div>
  );
}

export default ValidationIndicator;
