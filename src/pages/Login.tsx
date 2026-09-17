import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Droplets, HandHeart, Shield, HardHat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { setSession } from "@/lib/session";

export const USER_ROLES = ["citizen", "ngo", "worker", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your email or name"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(USER_ROLES),
});

type LoginForm = z.infer<typeof loginSchema>;

const roleLabels: Record<UserRole, string> = {
  citizen: "Citizen",
  ngo: "NGO",
  worker: "Field worker",
  admin: "Admin / Authority",
};

function roleFromSearch(searchParams: URLSearchParams): UserRole {
  const r = searchParams.get("role");
  if (r && (USER_ROLES as readonly string[]).includes(r)) return r as UserRole;
  return "citizen";
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromUrl = useMemo(() => roleFromSearch(searchParams), [searchParams]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      role: roleFromUrl,
    },
  });

  useEffect(() => {
    form.setValue("role", roleFromUrl);
  }, [roleFromUrl, form]);

  const selectedRole = useWatch({ control: form.control, name: "role" }) ?? roleFromUrl;

  const onSubmit = (data: LoginForm) => {
    const role = data.role;
    setSession({ identifier: data.identifier.trim(), role });
    toast.success(`Signed in as ${roleLabels[role]}`);

    if (role === "citizen") {
      navigate("/dashboard/citizen", { replace: true });
      return;
    }
    if (role === "ngo") {
      navigate("/dashboard/ngo", { replace: true });
      return;
    }
    if (role === "admin") {
      navigate("/dashboard/admin", { replace: true });
      return;
    }
    if (role === "worker") {
      navigate("/dashboard/worker", { replace: true });
      return;
    }
    navigate("/", { replace: true });
  };

  const isAdminPortal = selectedRole === "admin";
  const isNgoPortal = selectedRole === "ngo";
  const isWorker = selectedRole === "worker";

  const roleDescription: Record<UserRole, string> = {
    citizen: "Access your citizen dashboard: reports, map, rewards, and profile.",
    ngo: "Open the NGO workspace: missions, analytics, resources, and citizen requests.",
    worker: "Open the field worker hub: regional missions, shift status, and certifications (demo registry).",
    admin: "Open the authority console: citizen aggregates, NGO pipeline, and workforce analytics.",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-secondary/10 blur-3xl" />

      <Link
        to="/"
        className="absolute top-6 left-6 z-10 text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
        Back to home
      </Link>

      <Card className="w-full max-w-md relative glass-card border-border/60 shadow-xl shadow-primary/5 overflow-hidden">
        <div className="relative px-8 pt-10 pb-2 flex flex-col items-center text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[280px] h-[200px] rounded-full bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent blur-2xl pointer-events-none" />
          <Link
            to="/"
            className="group relative flex flex-col items-center rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <div className="relative">
              <div className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-primary/30 via-secondary/25 to-primary/20 opacity-80 blur-xl group-hover:opacity-100 transition-opacity duration-500" />
              <div
                className={`relative flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-[1.35rem] bg-gradient-to-br shadow-2xl ring-[3px] ring-background ${
                  isAdminPortal
                    ? "from-slate-700 to-primary shadow-slate-900/30"
                    : isNgoPortal
                      ? "from-ocean-mid to-primary shadow-ocean-mid/30"
                      : isWorker
                        ? "from-amber-600 to-amber-900 shadow-amber-900/30"
                        : "from-primary via-primary to-secondary shadow-primary/40"
                }`}
              >
                {isAdminPortal ? (
                  <Shield className="h-11 w-11 text-primary-foreground drop-shadow-md" strokeWidth={1.65} aria-hidden />
                ) : isNgoPortal ? (
                  <HandHeart className="h-11 w-11 text-primary-foreground drop-shadow-md" strokeWidth={1.65} aria-hidden />
                ) : isWorker ? (
                  <HardHat className="h-11 w-11 text-primary-foreground drop-shadow-md" strokeWidth={1.65} aria-hidden />
                ) : (
                  <Droplets className="h-11 w-11 text-primary-foreground drop-shadow-md" strokeWidth={1.65} aria-hidden />
                )}
              </div>
            </div>
            <h2 className="font-heading font-bold text-2xl mt-6 tracking-tight text-foreground">
              AquaGuard{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">AI</span>
            </h2>
          </Link>
        </div>

        <CardHeader className="space-y-1 text-center px-8 pt-4 pb-0">
          <CardTitle className="font-heading text-2xl">Log in</CardTitle>
          <CardDescription>{roleDescription[selectedRole]}</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-5 px-8 pt-6">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Controller
                name="role"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="role" className="rounded-xl">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier">Email or name</Label>
              <Input
                id="identifier"
                autoComplete="username"
                placeholder="you@example.com or Jane Doe"
                {...form.register("identifier")}
              />
              {form.formState.errors.identifier && (
                <p className="text-sm text-destructive">{form.formState.errors.identifier.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 px-8 pb-8">
            <Button type="submit" className="w-full rounded-full">
              Log in as {roleLabels[selectedRole]}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              No account?{" "}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
