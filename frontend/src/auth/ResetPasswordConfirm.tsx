import { zodResolver } from "@hookform/resolvers/zod";
import { Background, ReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { api, handleApiError, isAxiosError } from "@/api";
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
  password: z.string(),
  confirmPassword: z.string(),
});

type FormType = z.infer<typeof formSchema>;

function ResetPasswordConfirm() {
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    title(`Reset Password`);
  }, []);

  const form = useForm<FormType>({ resolver: zodResolver(formSchema) });

  const password = useRef({});
  password.current = form.watch("password", "");

  const onSubmit = async (values: FormType) => {
    if (values.password !== values.confirmPassword) {
      form.setError("confirmPassword", { message: "Passwords must match" });
      return;
    }
    try {
      await api.post(`/api/auth/password-reset/confirm/`, { password: values.password, token });
      toast.success("Password reset successfully");
      navigate("/auth/login");
    } catch (e) {
      const error = isAxiosError(e);
      if (error && e.response?.status == 404) {
        toast.error("Invalid token");
      } else {
        handleApiError(e, values, form.setError);
      }
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
                name="password"
                render={({ field }) => (
                  <FormItem className="relative">
                    <div className="flex items-center">
                      <FormLabel className="w-[200px]">New password</FormLabel>
                      <FormControl>
                        <Input type="password" autoFocus {...field} />
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
                      <FormLabel className="w-[200px]">Confirm password</FormLabel>
                      <FormControl>
                        <Input type="password" autoFocus {...field} />
                      </FormControl>
                    </div>
                    <FormMessage className="ml-[140px]" />
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
        </div>
      </div>
      <ReactFlow className="size-full">
        <Background gap={12} size={1} />
      </ReactFlow>
    </>
  );
}

export default ResetPasswordConfirm;
