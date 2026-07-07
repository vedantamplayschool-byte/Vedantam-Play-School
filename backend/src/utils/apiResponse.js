export const ok=(res,{message='Success',data=null,pagination=null,status=200}={})=>res.status(status).json({success:true,message,data,...(pagination?{pagination}:{})});
export const fail=(res,{message='Request failed',errors=null,status=400}={})=>res.status(status).json({success:false,message,...(errors?{errors}:{})});
