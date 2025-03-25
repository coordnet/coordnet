import { zodResolver } from "@hookform/resolvers/zod";
import { Background, ReactFlow } from "@xyflow/react";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { api, handleApiError } from "@/api";
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
});

type FormType = z.infer<typeof formSchema>;

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const sent = location.pathname.endsWith("/sent");

  useEffect(() => {
    title(`Reset Password`);
  }, []);

  const form = useForm<FormType>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (values: FormType) => {
    try {
      await api.post(`/api/auth/password-reset/`, values);
      navigate("/auth/reset-password/sent");
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
                Password Reset Link Sent
                <Check className="ml-2 size-4 text-green" strokeWidth={3} />
              </h1>
              <div className="my-5">
                We have sent you an email with a link to reset your password. Please check your
                inbox.
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
                <Button type="submit" className="my-2 w-full rounded bg-violet-600">
                  Reset password
                </Button>
                <Link to="/auth/login">
                  <Button variant="ghost" className="w-full">
                    Log in
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

export default ResetPassword;
