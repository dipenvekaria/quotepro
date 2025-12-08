'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Crown, Briefcase, TrendingUp, Wrench, Mail } from 'lucide-react'
import { UserRole, getRoleDisplayName } from '@/lib/permissions'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

interface TeamMember {
  id: string
  role: UserRole
  created_at: string
  user_id: string
}

interface TeamMemberManagerProps {
  teamMembers: TeamMember[]
  inviteEmail: string
  setInviteEmail: (email: string) => void
  inviteRole: UserRole
  setInviteRole: (role: UserRole) => void
  isInviting: boolean
  isSaving: boolean
  currentUserId: string
  onInvite: () => void
  onUpdateRole: (memberId: string, newRole: UserRole) => void
  onRemove: (memberId: string) => void
}

const roleIcons = {
  owner: Crown,
  office: Briefcase,
  sales: TrendingUp,
  technician: Wrench,
}

const roleColors = {
  owner: 'bg-amber-500 text-white',
  office: 'bg-purple-500 text-white',
  sales: 'bg-blue-500 text-white',
  technician: 'bg-green-500 text-white',
}

const roleBgColors = {
  owner: 'bg-amber-50 border-amber-200',
  office: 'bg-purple-50 border-purple-200',
  sales: 'bg-blue-50 border-blue-200',
  technician: 'bg-green-50 border-green-200',
}

export function TeamMemberManager({
  teamMembers,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  isInviting,
  isSaving,
  currentUserId,
  onInvite,
  onUpdateRole,
  onRemove,
}: TeamMemberManagerProps) {
  const supabase = createClientComponentClient()
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const [currentUserName, setCurrentUserName] = useState<string>('')
  
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserEmail(user.email || '')
        setCurrentUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown')
      }
    }
    fetchCurrentUser()
  }, [supabase])
  
  const isCurrentUser = (member: TeamMember) => member.user_id === currentUserId

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Team Members</CardTitle>
          </div>
          <CardDescription>
            Manage your team and assign roles based on their responsibilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite New Member */}
          <div className="space-y-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-lg">Invite Team Member</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        <span>Owner</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="office">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-purple-500" />
                        <span>Office/Scheduler</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sales">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span>Sales</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="technician">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-green-500" />
                        <span>Technician</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={onInvite}
                disabled={isInviting || !inviteEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
              >
                {isInviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              Team members will receive an email invitation to join your company
            </p>
          </div>

          {/* Current Team Members */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Current Team ({teamMembers.length})</h3>
            {teamMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                <Users className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No team members yet</p>
                <p className="text-sm">Invite your first team member to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => {
                  const RoleIcon = roleIcons[member.role]
                  const isYou = isCurrentUser(member)
                  
                  return (
                    <div
                      key={member.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border-2 rounded-lg gap-3 transition-all hover:shadow-md ${
                        isYou ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-full ${roleColors[member.role]}`}>
                          <RoleIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">
                              {isYou ? currentUserName : 'Team Member'}
                            </p>
                            {isYou && (
                              <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {isYou ? currentUserEmail : 'Email not available'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={roleColors[member.role]}>
                              {getRoleDisplayName(member.role)}
                            </Badge>
                            <p className="text-xs text-gray-400">
                              Joined {new Date(member.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => onUpdateRole(member.id, newRole as UserRole)}
                          disabled={isSaving || isYou}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-amber-500" />
                                <span>Owner</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="office">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-purple-500" />
                                <span>Office</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="sales">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                <span>Sales</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="technician">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-green-500" />
                                <span>Technician</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {!isYou && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRemove(member.id)}
                            disabled={isSaving}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Role Permissions Reference */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-bold text-lg">Role Permissions Reference</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`p-4 rounded-lg border-2 ${roleBgColors.owner}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-5 w-5 text-amber-600" />
                  <Badge className={roleColors.owner}>Owner</Badge>
                </div>
                <ul className="text-sm space-y-1.5 text-gray-700">
                  <li>✓ Full system access</li>
                  <li>✓ Manage team & roles</li>
                  <li>✓ Company settings</li>
                  <li>✓ Delete anything</li>
                  <li>✓ Billing control</li>
                </ul>
              </div>
              
              <div className={`p-4 rounded-lg border-2 ${roleBgColors.office}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                  <Badge className={roleColors.office}>Office</Badge>
                </div>
                <ul className="text-sm space-y-1.5 text-gray-700">
                  <li>✓ Manage leads & quotes</li>
                  <li>✓ Schedule jobs</li>
                  <li>✓ View everything</li>
                  <li>✗ No delete access</li>
                  <li>✗ No settings</li>
                </ul>
              </div>
              
              <div className={`p-4 rounded-lg border-2 ${roleBgColors.sales}`}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <Badge className={roleColors.sales}>Sales</Badge>
                </div>
                <ul className="text-sm space-y-1.5 text-gray-700">
                  <li>✓ Own leads/quotes only</li>
                  <li>✓ Create & send quotes</li>
                  <li>✗ See others' work</li>
                  <li>✗ No jobs/calendar</li>
                  <li>✗ No settings</li>
                </ul>
              </div>
              
              <div className={`p-4 rounded-lg border-2 ${roleBgColors.technician}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-5 w-5 text-green-600" />
                  <Badge className={roleColors.technician}>Technician</Badge>
                </div>
                <ul className="text-sm space-y-1.5 text-gray-700">
                  <li>✓ Assigned jobs only</li>
                  <li>✓ Update job status</li>
                  <li>✗ No leads/quotes</li>
                  <li>✗ No pricing access</li>
                  <li>✗ No settings</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
