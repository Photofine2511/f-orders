
import * as React from "react";
import { cn } from "@/lib/utils";

const Steps = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: number;
  }
>(({ value, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-4", className)}
    {...props}
    data-value={value}
    data-orientation="horizontal"
  />
));
Steps.displayName = "Steps";

const StepList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex", className)}
    {...props}
  />
));
StepList.displayName = "StepList";

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
}

const Step = React.forwardRef<HTMLDivElement, StepProps>(
  ({ value, className, ...props }, ref) => {
    const contextValue = React.useContext(StepContext);
    const isActive = contextValue?.value === value;
    const isComplete = contextValue?.value > value;
    
    return (
      <div
        ref={ref}
        data-state={isActive ? "active" : isComplete ? "complete" : "inactive"}
        className={cn("flex items-center", className)}
        {...props}
      />
    );
  }
);
Step.displayName = "Step";

const StepIndicator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const step = React.useContext(StepItemContext);
  const state = step?.dataset.state;
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
        state === "active" && "border-primary bg-primary text-primary-foreground",
        state === "complete" && "border-primary bg-primary text-primary-foreground",
        state === "inactive" && "border-muted-foreground text-muted-foreground",
        className
      )}
      {...props}
    />
  );
});
StepIndicator.displayName = "StepIndicator";

interface StepStatusProps extends React.HTMLAttributes<HTMLSpanElement> {
  complete: React.ReactNode;
  incomplete: React.ReactNode;
}

const StepStatus = React.forwardRef<HTMLSpanElement, StepStatusProps>(
  ({ complete, incomplete, className, ...props }, ref) => {
    const step = React.useContext(StepItemContext);
    const state = step?.dataset.state;
    
    return (
      <span
        ref={ref}
        className={cn("text-sm font-medium", className)}
        {...props}
      >
        {state === "complete" ? complete : incomplete}
      </span>
    );
  }
);
StepStatus.displayName = "StepStatus";

const StepTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm font-medium", className)}
    {...props}
  />
));
StepTitle.displayName = "StepTitle";

const StepDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
StepDescription.displayName = "StepDescription";

const StepSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-[2px] w-16 bg-muted-foreground/30 mx-2", className)}
    {...props}
  />
));
StepSeparator.displayName = "StepSeparator";

// Context
const StepContext = React.createContext<{ value: number } | null>(null);
const StepItemContext = React.createContext<HTMLElement | null>(null);

export {
  Steps,
  StepList,
  Step,
  StepIndicator,
  StepStatus,
  StepTitle,
  StepDescription,
  StepSeparator,
};
