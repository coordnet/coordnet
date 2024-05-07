import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactFlow, { Background } from "reactflow";
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
  confirmPassword: z.string(),
  name: z.string(),
});

type FormType = z.infer<typeof formSchema>;

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const sent = location.pathname.endsWith("/sent");

  useEffect(() => {
    title(`Signup`);

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
      <div className="size-full flex items-center justify-center absolute z-10">
        <div className="bg-white min-w-[35vw] max-w-[500px] shadow-lg rounded-md border p-5">
          {sent ? (
            <>
              <img
                src="/static/coordination-network-logo.png"
                className="max-w-[250px] w-full m-auto mb-5"
              />
              <h1 className="text-lg flex items-center justify-center font-medium">
                Confirmation email sent
                <Check className="text-green ml-2 size-4" strokeWidth={3} />
              </h1>
              <div className="my-5">
                We have sent you an email with a link to confirm your email address. Please check
                your inbox.
              </div>
              <Link to="/auth/login">
                <Button type="submit" className="w-full bg-violet-600 rounded my-2">
                  Go back
                </Button>
              </Link>
            </>
          ) : (
            <Form {...form}>
              <img
                src="/static/coordination-network-logo.png"
                className="max-w-[250px] w-full m-auto mb-4"
              />
              <h1 className="text-lg font-medium mb-4 text-center">Sign up</h1>
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
                <Button type="submit" className="w-full bg-violet-600 rounded my-2">
                  Signup
                </Button>
                <Link to="/auth/reset-password">
                  <Button variant="ghost" className="w-full -my-2">
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
