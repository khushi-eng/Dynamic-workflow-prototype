import React, { useCallback, useRef, useState } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Controls,
  Background,
  useReactFlow,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ================= INITIAL NODE ================= */
const initialNodes = [
  {
    id: "start",
    type: "input",
    position: { x: 350, y: 40 },
    data: {
      label: "Start",
      executed: false,
      isCustom: false,
      condition: "",
      code: "",
    },
  },
];

/* ================= ACTION FUNCTIONS ================= */
const actionHandlers = {
  Start: () => 1,

  "Call Payment Gateway": () => 1,
  "Call eSignature Service": () => 1,
  "Call Risk Evaluation Service": () => 1,
  "Call Third-Party API": () => 1,

  "Execute Underwriting Rule": () => 1,
  "Invoke Rating Engine": () => 1,
  "Validate Policy": () => 1,

  "Update Policy Status": () => {
    console.log("Policy status updated");
    return 1;
  },

  "Update Transaction Status": () => 1,

  "Persist Data": () => 1,

  "Emit Event": () => {
    console.log("Event emitted");
    return 1;
  },

  "Send Notification": () => {
    console.log("Notification sent to customer");
    return 1;
  },

  Condition: () => 1,
};

/* ================= FLOW CANVAS ================= */
function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef(null);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCode, setCustomCode] = useState("");

  /* ---------- CONNECT ---------- */
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  /* ---------- DRAG & DROP ---------- */
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e) => {
    e.preventDefault();
    const label = e.dataTransfer.getData("application/reactflow");
    if (!label) return;

    const pos = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });

    setNodes((nds) =>
      nds.concat({
        id: `${Date.now()}`,
        type: "default",
        position: pos,
        data: {
          label,
          executed: false,
          isCustom: false,
          condition: "",
          code: "",
        },
      })
    );
  };

  /* ---------- CUSTOM NODE ---------- */
  const createCustomNode = () => {
    setNodes((nds) =>
      nds.concat({
        id: `${Date.now()}`,
        type: "default",
        position: { x: 400, y: 200 },
        data: {
          label: customName,
          executed: false,
          isCustom: true,
          code: customCode,
          condition: "",
        },
      })
    );
    setShowCustomModal(false);
    setCustomName("");
    setCustomCode("");
  };

  /* ---------- EXECUTION ENGINE ---------- */
  const runWorkflow = () => {
    console.clear();
    console.log("=== WORKFLOW START ===");

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, executed: false },
        style: {},
      }))
    );

    const nodeMap = {};
    nodes.forEach((n) => (nodeMap[n.id] = n));
    let current = nodes.find((n) => n.data.label === "Start");

    const markExecuted = (id) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: { ...n.data, executed: true },
                style: { background: "#c8e6c9" },
              }
            : n
        )
      );
    };

    while (current) {
      let result = 0;

      if (current.data.isCustom && current.data.code) {
        try {
          Function(current.data.code)();
          result = 1;
        } catch {
          result = 0;
        }
      } else {
        const fn = actionHandlers[current.data.label];
        result = fn ? fn() : 0;
      }

      markExecuted(current.id);
      console.log(`${current.data.label} → ${result}`);

      const next = edges.find((e) => e.source === current.id);
      if (!next || result === 0) break;

      current = nodeMap[next.target];
    }

    console.log("=== WORKFLOW END ===");
  };

  /* ---------- PDF EXPORT (FIXED & WORKING) ---------- */
  const exportPDF = async () => {
    const viewport = reactFlowWrapper.current.querySelector(
      ".react-flow__viewport"
    );

    if (!viewport) {
      alert("React Flow viewport not found");
      return;
    }

    const originalTransform = viewport.style.transform;
    viewport.style.transform = "none";

    setTimeout(async () => {
      const canvas = await html2canvas(viewport, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      viewport.style.transform = originalTransform;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "px", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight =
        (canvas.height * pdfWidth) / canvas.width;

      pdf.text("Workflow Design & Execution", 20, 20);
      pdf.addImage(
        imgData,
        "PNG",
        20,
        40,
        pdfWidth - 40,
        pdfHeight
      );

      pdf.save("workflow.pdf");
    }, 300);
  };

  /* ---------- XML EXPORT ---------- */
  const exportXML = () => {
    let xml = `<?xml version="1.0"?>\n<workflow>\n<nodes>\n`;
    nodes.forEach((n) => {
      xml += `<node id="${n.id}" label="${n.data.label}" executed="${n.data.executed}" />\n`;
    });
    xml += `</nodes>\n<edges>\n`;
    edges.forEach((e) => {
      xml += `<edge from="${e.source}" to="${e.target}" />\n`;
    });
    xml += `</edges>\n</workflow>`;

    const blob = new Blob([xml], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "workflow.xml";
    a.click();
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <h4>Trigger</h4>
        <SidebarItem label="Start" />

        <h4>Integration</h4>
        <SidebarItem label="Call Payment Gateway" />
        <SidebarItem label="Call eSignature Service" />
        <SidebarItem label="Call Risk Evaluation Service" />
        <SidebarItem label="Call Third-Party API" />

        <h4>Business / Rules</h4>
        <SidebarItem label="Execute Underwriting Rule" />
        <SidebarItem label="Invoke Rating Engine" />
        <SidebarItem label="Validate Policy" />
        <SidebarItem label="Update Policy Status" />
        <SidebarItem label="Update Transaction Status" />

        <h4>System</h4>
        <SidebarItem label="Persist Data" />
        <SidebarItem label="Emit Event" />
        <SidebarItem label="Send Notification" />



        <h4>Custom</h4>
        <button onClick={() => setShowCustomModal(true)}>
          + Create Custom Node
        </button>

        <button onClick={runWorkflow}>RUN WORKFLOW</button>
        <button onClick={exportXML}>EXPORT XML</button>
        <button onClick={exportPDF}>EXPORT PDF</button>
      </div>

      {/* CANVAS */}
      <div style={{ flexGrow: 1 }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onConnect={onConnect}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {/* CUSTOM NODE MODAL */}
      {showCustomModal && (
        <div style={modalStyle}>
          <div style={modalBox}>
            <h4>Create Custom Node</h4>
            <input
              placeholder="Node name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <textarea
              placeholder="JS logic"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
            />
            <button onClick={createCustomNode}>Create</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= HELPERS ================= */
const SidebarItem = ({ label }) => (
  <div
    draggable
    onDragStart={(e) =>
      e.dataTransfer.setData("application/reactflow", label)
    }
    style={nodeStyle}
  >
    {label}
  </div>
);

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}

/* ================= STYLES ================= */
const sidebarStyle = {
  width: 260,
  padding: 10,
  background: "#f4f6f8",
  borderRight: "1px solid #ccc",
};
const nodeStyle = {
  padding: 8,
  marginBottom: 6,
  border: "1px solid #333",
  background: "#fff",
  cursor: "grab",
};
const modalStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.3)",
};
const modalBox = {
  background: "#fff",
  padding: 20,
  width: 400,
  margin: "100px auto",
};
