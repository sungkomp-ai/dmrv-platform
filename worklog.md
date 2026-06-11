---
Task ID: 2
Agent: main
Task: ดำเนินการต่อจาก session ก่อน — แก้ไข API routes, ตรวจสอบระบบ, อธิบายเป็นภาษาไทย

Work Log:
- แก้ไข API routes ทั้ง 5 ไฟล์ (edge-nodes, ingest, batch, sample) ให้ใช้ 127.0.0.1 แทน localhost เพื่อหลีกเลี่ยง IPv6 resolution issue
- เพิ่ม AbortSignal.timeout() ในทุก fetch call เพื่อป้องกัน request ค้าง
- สร้าง restart-wrapper.js สำหรับ auto-restart Next.js dev server
- ตรวจสอบ IoT Ingestion page ด้วย Agent Browser: ทุกฟีเจอร์ทำงานถูกต้อง
- อธิบายระบบ IoT Ingestion เป็นภาษาไทยอย่างครบถ้วน

Stage Summary:
- API routes แก้ไขแล้ว: localhost → 127.0.0.1 + timeout
- IoT Ingestion ตรวจสอบแล้ว: Realtime, Batch, Edge Nodes, Certification, Chart, Sample/API tabs ทำงานถูกต้อง
- สถานี 5 จังหวัด: กทม., เชียงใหม่, ขอนแก่น, ภูเก็ต, สุราษฎร์ธานี (4 online, 1 offline)
- ระบบ Certification ตรวจสอบ 5 ข้อ: Range Check, Timestamp Order, Integrity Hash, Edge Signature, Anomaly Ratio
- อธิบายเป็นภาษาไทยครบถ้วน: ทั้ง Realtime/Batch workflow, Edge Node config, Certification, API, Database models, การใช้งานในบริบท T-VER
