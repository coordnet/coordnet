import { zodResolver } from "@hookform/resolvers/zod";
import { Background, ReactFlow } from "@xyflow/react";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { authApi, handleApiError } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { title } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  confirmPassword: z.string(),
  name: z.string(),
});

type FormType = z.infer<typeof formSchema>;

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const sent = location.pathname.endsWith("/sent");

  useEffect(() => {
    title(`Sign Up`);

    const getUser = async () => {
      try {
        await authApi.get("/api/users/me/");
        navigate("/", { replace: true });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // If logged out then don't redirect
      }
    };

    getUser();
  }, []);

  const form = useForm<FormType>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (values: FormType) => {
    if (values.password !== values.confirmPassword) {
      form.setError("confirmPassword", { message: "Passwords must match" });
      return;
    }

    try {
      await authApi.post(`/api/auth/register/`, {
        email: values.email,
        name: values.name,
        password: values.password,
      });
      navigate("/auth/signup/sent");
    } catch (e) {
      handleApiError(e, values, form.setError);
    }
  };

  return (
    <>
      <div className="absolute z-10 flex size-full items-center justify-center">
        <div className="min-w-[35vw] max-w-[500px] rounded-md border bg-white p-5 shadow-lg">
          {sent ? (
            <>
              <img
                src="/static/coordination-network-logo.png"
                className="m-auto mb-5 w-full max-w-[250px]"
              />
              <h1 className="flex items-center justify-center text-lg font-medium">
                Confirmation email sent
                <Check className="ml-2 size-4 text-green" strokeWidth={3} />
              </h1>
              <div className="my-5">
                We have sent you an email with a link to confirm your email address. Please check
                your inbox.
              </div>
              <Link to="/auth/login">
                <Button type="submit" className="my-2 w-full rounded bg-violet-600">
                  Go back
                </Button>
              </Link>
            </>
          ) : (
            <Form {...form}>
              <img
                src="/static/coordination-network-logo.png"
                className="m-auto mb-4 w-full max-w-[250px]"
              />
              <h1 className="mb-4 text-center text-lg font-medium">Private Beta Sign Up</h1>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <div className="flex items-center">
                        <FormLabel className="w-[200px]">Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage className="ml-[140px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <div className="flex items-center">
                        <FormLabel className="w-[200px]">Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Your email address" autoFocus {...field} />
                        </FormControl>
                      </div>
                      <FormMessage className="ml-[140px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <div className="flex items-center">
                        <FormLabel className="w-[200px]">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Your password" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage className="ml-[140px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <div className="flex items-center">
                        <FormLabel className="w-[200px]">Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm password" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage className="ml-[140px]" />
                    </FormItem>
                  )}
                />
                <div className="mb-2 mt-3 text-center text-sm">
                  Participation in the private beta follows our
                  <br />
                  <a
                    href="https://app.coord.dev/spaces/7aa361ce-e6dc-44b9-9761-ba0e1ba4c4e7?nodePage=95836692-619e-438d-9fd5-7b6be89ff1f0"
                    target="_blank"
                    rel="noreferrer"
                  >
                    testing community guidelines, terms and conditions
                  </a>
                  .
                </div>
                <Button type="submit" className="my-2 w-full rounded bg-violet-600">
                  Sign Up
                </Button>
                <Link to="/auth/reset-password">
                  <Button variant="ghost" className="-my-2 w-full">
                    Reset password
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button variant="ghost" className="w-full">
                    Login
                  </Button>
                </Link>
              </form>
            </Form>
          )}
        </div>
      </div>
      <ReactFlow className="size-full">
        <Background gap={12} size={1} />
      </ReactFlow>
    </>
  );
}

export default Signup;
