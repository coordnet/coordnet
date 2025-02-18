import { zodResolver } from "@hookform/resolvers/zod";
import { Background, ReactFlow } from "@xyflow/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import store from "store2";
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
});

type FormType = z.infer<typeof formSchema>;

function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    title("Login");

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
    try {
      const response = await authApi.post(
        "/api/auth/login/",
        {},
        { auth: { username: values.email, password: values.password } }
      );
      store("coordnet-auth", response.data.token);

      // Login successful so check if there is a redirect URL
      const dest = new URL(window.location.origin);
      const queryParameters = new URLSearchParams(window.location.search);
      const redirect = queryParameters.get("redirect") ?? "";
      if (redirect) {
        try {
          const redirectUrl = new URL(window.location.origin + redirect);
          if (
            redirectUrl.pathname.startsWith("/spaces/") ||
            redirectUrl.pathname.startsWith("/auth/") ||
            redirectUrl.pathname.startsWith("/skills/") ||
            redirectUrl.pathname.startsWith("/profiles/")
          ) {
            dest.pathname = redirectUrl.pathname;
            dest.search = redirectUrl.search;
          }
        } catch {
          // Ignore invalid redirect URLs
        }
      }
      window.location.href = dest.toString();
    } catch (e) {
      handleApiError(e, values, form.setError);
    }
  };

  return (
    <>
      <div className="absolute z-10 flex size-full items-center justify-center">
        <div className="min-w-[35vw] max-w-[500px] rounded-md border bg-white p-5 shadow-lg">
          <Form {...form}>
            <img
              src="/static/coordination-network-logo.png"
              className="m-auto mb-4 w-full max-w-[250px]"
            />
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="relative">
                    <div className="flex items-center">
                      <FormLabel className="w-[110px]">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Your email address" autoFocus {...field} />
                      </FormControl>
                    </div>
                    <FormMessage className="ml-[90px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="relative">
                    <div className="flex items-center">
                      <FormLabel className="w-[110px]">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Your password" {...field} />
                      </FormControl>
                    </div>
                    <FormMessage className="ml-[90px]" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="my-2 w-full rounded bg-violet-600">
                Login
              </Button>
              <Link to="/auth/reset-password">
                <Button variant="ghost" className="-my-2 w-full">
                  Reset password
                </Button>
              </Link>
              {/* <Link to="/sign-up">
                <Button variant="ghost" className="w-full">
                  Sign up
                </Button>
              </Link> */}
            </form>
          </Form>
        </div>
      </div>
      <ReactFlow className="size-full">
        <Background gap={12} size={1} />
      </ReactFlow>
    </>
  );
}

export default Login;
