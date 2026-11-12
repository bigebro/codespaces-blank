import { FunctionDeclaration, SchemaType } from "@/lib/ai/genai";

export const memoryToolDeclarations: FunctionDeclaration[] = [
  {
    name: "search_store_rules",
    description: "Дэлгүүрийн дотоод дүрэм, нийлүүлэгчийн цагийн хуваарь, эсвэл хадгалах хугацааны тогтмол мэдээллийг хайх хэрэгсэл.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { 
          type: SchemaType.STRING, 
          description: "Хайх сэдэв (Жишээ нь: 'Сүү хэзээ ирдэг вэ?', 'Талхны хадгалах хугацаа')" 
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_past_experiences",
    description: "Өнгөрсөнд хийж байсан туршилтууд, гарсан асуудлууд болон түүнээс сурсан сургамжуудыг (Experience Ledger) татах хэрэгсэл.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: { 
          type: SchemaType.STRING, 
          description: "Асуудал эсвэл туршилтын сэдэв (Жишээ нь: 'Сүүний алдагдал', 'Үнэ нэмэх')" 
        },
      },
      required: ["topic"],
    },
  }
];