'use client';
import {createContext,useContext,useState,useEffect} from 'react';
import {initialProducts,initialCustomers,initialInvoices,initialSettings} from './data';
const C=createContext(null);
const initial={products:initialProducts,customers:initialCustomers,invoices:initialInvoices,settings:initialSettings};
export function StoreProvider({children}){
 const [data,setData]=useState(initial);const [ready,setReady]=useState(false);
 useEffect(()=>{try{let s=localStorage.getItem('cam-crew-billing-v1');if(s){const parsed=JSON.parse(s);setData({...initial,...parsed});}}catch(e){console.warn('Could not read saved data',e)}setReady(true)},[]);
 useEffect(()=>{if(ready)localStorage.setItem('cam-crew-billing-v1',JSON.stringify(data))},[data,ready]);
 const update=(key,value)=>setData(prev=>({...prev,[key]:typeof value==='function'?value(prev[key]):value}));
 const reset=()=>setData(initial);
 return <C.Provider value={{...data,update,reset,ready}}>{children}</C.Provider>;
}
export const useStore=()=>useContext(C);
