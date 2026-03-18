export const setupLiveSocket = (io, socket) => {
  // Student "Knocks"
  socket.on("student-request-join", (data) => {
    const { sessionId, classId, studentName, studentId } = data;
    
    socket.to(classId).emit("student-knocking", {
      studentId,
      studentName,
      socketId: socket.id // We need this to send the WebRTC offer back
    });
  });

  // Teacher Approves
  socket.on("teacher-approve-student", (data) => {
    const { studentSocketId, sessionId } = data;
    
    // Tell the specific student they are allowed to initiate WebRTC
    io.to(studentSocketId).emit("join-approved", { sessionId });
  });
};