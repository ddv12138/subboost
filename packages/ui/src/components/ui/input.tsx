"use client";

import * as React from "react";
import { cn } from "@subboost/ui/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const isDateInput = type === "date";

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-50 transition-colors",
          isDateInput &&
            "appearance-none [-webkit-appearance:none] [color-scheme:dark] [-webkit-text-fill-color:rgb(255,255,255)] text-left [&::-webkit-datetime-edit]:text-white [&::-webkit-datetime-edit]:text-left [&::-webkit-datetime-edit-fields-wrapper]:text-white [&::-webkit-datetime-edit-text]:text-white [&::-webkit-datetime-edit-month-field]:text-white [&::-webkit-datetime-edit-day-field]:text-white [&::-webkit-datetime-edit-year-field]:text-white [&::-webkit-date-and-time-value]:text-white [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:block [&::-webkit-date-and-time-value]:w-full [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
