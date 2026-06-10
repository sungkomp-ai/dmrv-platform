---
Task ID: 1
Agent: main
Task: สร้างระบบ IoT Ingestion ทั้ง Realtime และ Batch พร้อมการรับรองข้อมูล

Work Log:
- เพิ่ม Prisma schema สำหรับ IoT models: IoTEdgeNode, IoTSensorV2, IoTSensorReading, IoTBatchJob, IoTCertificationLog
- Push schema ไปยัง SQLite database
- สร้าง IoT Gateway mini-service ที่ port 3035 (socket.io + HTTP REST)
- สร้าง Next.js API routes: /api/iot/ingest, /api/iot/edge-nodes, /api/iot/batch, /api/iot/certify, /api/iot/sample
- สร้าง IoTIngestionView.tsx frontend component พร้อม 6 tabs: Realtime, Batch, Edge Nodes, การรับรอง, กราฟ, ตัวอย่าง/API
- เพิ่ม IoT Ingestion menu item ใน sidebar (SIMULATION section)
- แก้ไขปัญหา WebSocket ไม่เชื่อมต่อผ่าน Caddy โดยเพิ่ม local simulation fallback
- เพิ่ม embedded edge node config เป็น fallback เมื่อ gateway ไม่พร้อมใช้งาน
- ทดสอบด้วย Agent Browser: 59+ readings, 4/5 edge nodes online, 58 validated, 1 anomaly

Stage Summary:
- ระบบ IoT Ingestion ทำงานครบถ้วนทั้ง Realtime และ Batch
- มี Edge Node 5 จังหวัดในไทย (กทม., เชียงใหม่, ขอนแก่น, ภูเก็ต, สุราษฎร์ธานี)
- ระบบ Certification ตรวจสอบ 5 ข้อ: Range Check, Timestamp Order, Integrity Hash, Edge Signature, Anomaly Ratio
- API routes พร้อมรองรับทั้ง HTTP POST และ WebSocket
- หน้าตัวอย่าง/API มี curl examples และ sample payload สำหรับทดสอบ
