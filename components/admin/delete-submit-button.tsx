"use client";

import { Button, type ButtonProps } from "@/components/ui/button";

type DeleteSubmitButtonProps = Omit<ButtonProps, "type" | "variant"> & {
  confirmMessage: string;
};

export function DeleteSubmitButton({
  confirmMessage,
  onClick,
  children = "削除",
  ...props
}: DeleteSubmitButtonProps) {
  return (
    <Button
      {...props}
      type="submit"
      variant="destructive"
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}