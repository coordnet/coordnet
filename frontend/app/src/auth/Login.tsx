import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import ReactFlow, { Background } from "reactflow";
import store from "store2";
import { z } from "zod";

import { authApi, handleApiError } from "@/api";

import { Button } from "../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { title } from "../utils";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

type FormType = z.infer<typeof formSchema>;

function Login() {
  const navigate = useNavigate();
  const queryParameters = new URLSearchParams(window.location.search);
  const redirect = queryParameters.get("redirect") ?? "";

  useEffect(() => {
    title(`Login`);

    const getUser = async () => {
      try {
        await authApi.get("/api/users/me/");
        navigate("/", { replace: true });
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
        `/api/auth/login/`,
        {},
        { auth: { username: values.email, password: values.password } },
      );
      store("coordnet-auth", response.data.token);
      window.location.href = redirect ? redirect : "/";
    } catch (e) {
      handleApiError(e, values, form.setError);
    }
  };

  return (
    <>
      <div className="size-full flex items-center justify-center absolute z-10">
        <div className="bg-white min-w-[35vw] max-w-[500px] shadow-lg rounded-md border p-5">
          <Form {...form}>
            <img
              src="/static/coordination-network-logo.png"
              className="max-w-[250px] w-full m-auto mb-4"
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
              <Button type="submit" className="w-full bg-violet-600 rounded my-2">
                Login
              </Button>
              <Link to="/reset-password">
                <Button variant="ghost" className="w-full -my-2">
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
