import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@nitap/ui/components/card";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="glass-card w-full max-w-md rounded-3xl border-0 [--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="font-display text-3xl leading-tight font-semibold tracking-tight">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      {footer ? (
        <CardFooter className="text-muted-foreground bg-transparent text-sm">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
