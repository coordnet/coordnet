import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactFlow, { Background } from "reactflow";
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
  token: z.string(),
});

type FormType = z.infer<typeof formSchema>;

function VerifyEmail() {
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    title(`Verify Email`);
  }, []);

  const form = useForm<FormType>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (values: FormType) => {
    try {
      await api.post(`/api/auth/verify/`, values);
      toast.success("Token verified");
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

  useEffect(() => {
    if (token) {
      form.setValue("token", token);
      form.handleSubmit(onSubmit)();
    }
  }, [token, form]);

  return (
    <>
      <div className="size-full flex items-center justify-center absolute z-10">
        <div className="bg-white min-w-[35vw] max-w-[500px] shadow-lg rounded-md border p-5">
          <Form {...form}>
            <img
              src="/static/coordination-network-logo.png"
              className="max-w-[250px] w-full m-auto mb-4"
            />
            <h1 className="text-lg flex items-center justify-center font-medium">
              Verify your email address
            </h1>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-2 mt-4">
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem className="relative">
                    <div className="flex items-center">
                      <FormLabel className="w-[200px]">Token</FormLabel>
                      <FormControl>
                        <Input type="password" autoFocus {...field} />
                      </FormControl>
                    </div>
                    <FormMessage className="ml-[140px]" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-violet-600 rounded my-2">
                Verify Email
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

export default VerifyEmail;
